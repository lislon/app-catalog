import type {
  GroupingTagDefinition,
  Resource,
} from '../types/common/appCatalogTypes'
import { getDbClient } from './client'
import { TABLE_SYNC_MAGAZINE } from './tableSyncMagazine'
import { tableSyncPrisma } from './tableSyncPrismaAdapter'
import { readFile, readdir, stat } from 'node:fs/promises'
import { group } from 'radashi'
import { upsertAsset } from '../modules/assets/upsertAsset'
import type { ApprovalMethod, Group, Person } from '../types'
import type { PrismaClient } from '../generated/prisma/client'
import { naturalSort } from '../utils/naturalSort'
import { parseSourceSlug } from '../utils/parseSourceSlug'

export interface SyncAppCatalogResult {
  created: number
  updated: number
  deleted: number
  total: number
}

interface AssetSyncResult {
  screenshotIds: string[]
  iconName: string | null
}

function isFileNotFoundError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  )
}

async function processAssetDirectory(
  dirPath: string,
  appSlug: string,
  assetType: 'screenshot' | 'icon',
  prisma: PrismaClient,
): Promise<string[]> {
  try {
    const files = await readdir(dirPath)
    const sortedFiles = naturalSort(files)
    const assetIds: string[] = []

    for (let i = 0; i < sortedFiles.length; i++) {
      const fileName = sortedFiles[i]
      if (!fileName) continue

      const assetName =
        assetType === 'screenshot'
          ? `${appSlug}-screenshot-${i + 1}`
          : `${appSlug}-icon`

      const id = await upsertAsset({
        prisma,
        buffer: await readFile(`${dirPath}/${fileName}`),
        originalFilename: fileName,
        name: assetName,
        assetType,
      })
      assetIds.push(id)

      // For icons, only process the first file
      if (assetType === 'icon') {
        break
      }
    }

    return assetIds
  } catch (error: unknown) {
    if (isFileNotFoundError(error)) {
      return []
    }
    throw error
  }
}

async function syncAppAssets(
  appSlug: string,
  appPath: string,
  prisma: PrismaClient,
): Promise<AssetSyncResult> {
  const screenshotIds = await processAssetDirectory(
    `${appPath}/screenshots`,
    appSlug,
    'screenshot',
    prisma,
  )

  const iconIds = await processAssetDirectory(
    `${appPath}/icons`,
    appSlug,
    'icon',
    prisma,
  )

  return {
    screenshotIds,
    iconName: iconIds.length > 0 ? `${appSlug}-icon` : null,
  }
}

async function syncAssetsFromFileSystem(
  resources: Resource[],
  allAppsAssetsPath: string,
) {
  const appDirectories = await readdir(allAppsAssetsPath)
  const prisma = getDbClient()
  const bySlug = group(resources, (a) => a.slug)

  for (const appDirName of appDirectories) {
    try {
      const stats = await stat(`${allAppsAssetsPath}/${appDirName}`)
      if (!stats.isDirectory()) {
        continue
      }
    } catch (error: unknown) {
      if (isFileNotFoundError(error)) {
        continue
      }
      throw error
    }

    const appSlug = appDirName
    if (!bySlug[appSlug]) {
      throw new Error(
        `App '${appSlug}' does not exist in the app catalog. Existing apps: ${Object.keys(bySlug).join(', ')}`,
      )
    }

    try {
      const { screenshotIds, iconName } = await syncAppAssets(
        appSlug,
        `${allAppsAssetsPath}/${appDirName}`,
        prisma,
      )

      const updateData: {
        screenshotIds?: string[]
        iconName?: string | null
      } = {}

      if (screenshotIds.length > 0) {
        updateData.screenshotIds = screenshotIds
      }
      if (iconName !== null) {
        updateData.iconName = iconName
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.dbResource.update({
          where: { slug: appSlug },
          data: updateData,
        })
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      throw new Error(
        `Error while upserting assets for app '${appSlug}': ${errorMessage}`,
      )
    }
  }
}

/**
 * Optional data to sync alongside the core app catalog.
 */
export interface SyncAppCatalogOptions {
  persons?: Person[]
  groups?: Group[]
}

/**
 * Syncs app catalog data to the database using table sync.
 * This will create new resources, update existing ones, and delete any that are no longer in the input.
 *
 * Note: Call connectDb() before and disconnectDb() after if running in a script.
 */
export async function syncAppCatalog(
  resources: Resource[],
  tagsDefinitions: GroupingTagDefinition[],
  approvalMethods: ApprovalMethod[],
  screenshotsPath?: string,
  options?: SyncAppCatalogOptions,
): Promise<SyncAppCatalogResult> {
  try {
    const prisma = getDbClient()

    // Sync Persons first (groups depend on persons via memberships)
    if (options?.persons) {
      const dbPersons = options.persons.map((p) => ({
        slug: p.slug,
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.email ?? null,
      }))
      await tableSyncPrisma({
        prisma,
        ...TABLE_SYNC_MAGAZINE.DbPerson,
      }).sync(dbPersons)
    }

    // Sync Groups (without memberships first)
    if (options?.groups) {
      const dbGroups = options.groups.map((g) => ({
        slug: g.slug,
        displayName: g.displayName ?? null,
        email: g.email ?? null,
      }))
      await tableSyncPrisma({
        prisma,
        ...TABLE_SYNC_MAGAZINE.DbGroup,
      }).sync(dbGroups)

      // Now sync GroupMemberships
      const allMemberships = options.groups.flatMap((g) =>
        g.memberSlugs.map((personSlug) => ({
          groupSlug: g.slug,
          personSlug,
        })),
      )
      await tableSyncPrisma({
        prisma,
        ...TABLE_SYNC_MAGAZINE.DbGroupMembership,
      }).sync(allMemberships)
    }

    await tableSyncPrisma({
      prisma,
      ...TABLE_SYNC_MAGAZINE.DbApprovalMethod,
    }).sync(approvalMethods)

    const sync = tableSyncPrisma({
      prisma,
      ...TABLE_SYNC_MAGAZINE.DbResource,
    })

    await tableSyncPrisma({
      prisma,
      ...TABLE_SYNC_MAGAZINE.DbAppTagDefinition,
    }).sync(tagsDefinitions)

    // Collect all unique source slugs for sync
    const uniqueSourceSlugs = new Set<string>()
    for (const resource of resources) {
      for (const source of resource.sources ?? []) {
        const url = typeof source === 'string' ? source : source.url
        const sourceSlug = parseSourceSlug(url)
        uniqueSourceSlugs.add(sourceSlug)
      }
    }

    // Sync Source entries using tableSyncPrisma
    const sources = Array.from(uniqueSourceSlugs).map((slug) => ({
      slug,
      userPrompt: null,
    }))
    await tableSyncPrisma({
      prisma,
      ...TABLE_SYNC_MAGAZINE.Source,
    }).sync(sources)

    // Sort resources: parents first (no parentSlug), then children — for FK integrity
    const sortedResources = [...resources].sort((a, b) => {
      const aIsChild = a.parentSlug ? 1 : 0
      const bIsChild = b.parentSlug ? 1 : 0
      return aIsChild - bIsChild
    })

    // Transform Resource to DbResource format (scalar fields only)
    const dbResources = sortedResources.map((resource) => {
      const slug =
        resource.slug ||
        resource.displayName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')

      return {
        slug,
        type: resource.type ?? 'application',
        displayName: resource.displayName,
        abbreviation: resource.abbreviation ?? null,
        nicknames: resource.nicknames ?? [],
        description: resource.description,
        teams: resource.teams ?? [],
        accessRequest: resource.accessRequest ?? null,
        notes: resource.notes ?? null,
        tags: resource.tags ?? [],
        appUrl: resource.appUrl ?? null,
        links: resource.links ?? null,
        iconName: resource.iconName ?? null,
        screenshotIds: resource.screenshotIds ?? [],
        deprecated: resource.deprecated ?? null,
        aiPrompt: resource.aiPrompt ?? null,
        urlIssues: resource.urlIssues ?? [],
        tiers: resource.tiers ?? null,
        // Fields from former SubResource
        parentSlug: resource.parentSlug ?? null,
        tier: resource.tier ?? null,
        familySlug: resource.familySlug ?? null,
        aliases: resource.aliases ?? [],
        ownerPersonSlug: resource.ownerPersonSlug ?? null,
        accessMaintainerGroupSlugs: resource.accessMaintainerGroupSlugs ?? [],
        accessComments: resource.accessComments ?? null,
        extra: resource.extra ?? null,
      }
    })

    // Sync resources
    const result = await sync.sync(dbResources)

    // Resolve slug -> id for synced resources so SourceReference can reference by resourceId
    const slugs = dbResources.map((a) => a.slug)
    const resourceRows = await prisma.dbResource.findMany({
      where: { slug: { in: slugs } },
      select: { slug: true, id: true },
    })
    const slugToId = Object.fromEntries(resourceRows.map((r) => [r.slug, r.id]))

    // Build allSourceRefs with resourceId (slug already resolved to id)
    const allSourceRefs = sortedResources.flatMap((resource) => {
      const resourceSlug =
        resource.slug ||
        resource.displayName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      const resourceId = slugToId[resourceSlug]
      if (!resourceId) {
        throw new Error(
          `Resource '${resourceSlug}' has no id after sync. Existing slugs: ${Object.keys(slugToId).join(', ')}`,
        )
      }

      return (resource.sources ?? []).map((source) => {
        const url = typeof source === 'string' ? source : source.url
        const sourceSlug = parseSourceSlug(url)
        return {
          resourceId,
          sourceSlug,
          url,
          parseDate: null,
          excerpts: [],
          userPrompt: null,
        }
      })
    })

    // Then sync all SourceReferences (with set semantics: old ones deleted, new ones created)
    await tableSyncPrisma({
      prisma,
      ...TABLE_SYNC_MAGAZINE.SourceReference,
    }).sync(allSourceRefs)

    // Get actual synced data to calculate stats
    const actual = result.getActual()

    if (screenshotsPath) {
      await syncAssetsFromFileSystem(resources, screenshotsPath)
    } else {
      console.warn('Do not sync screenhots')
    }

    return {
      created:
        actual.length - resources.length + (resources.length - actual.length),
      updated: 0, // TableSync doesn't expose this directly
      deleted: 0, // TableSync doesn't expose this directly
      total: actual.length,
    }
  } catch (error) {
    // Wrap error with context
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    throw new Error(
      `Error syncing app catalog: ${errorMessage}\n\nDetails:\n${errorStack || 'No stack trace available'}`,
    )
  }
}
