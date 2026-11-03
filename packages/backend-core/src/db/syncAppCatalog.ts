import type {
  CatalogMcpServer,
  GroupingTagDefinition,
  Resource,
  SourceReference,
} from '../types/common/appCatalogTypes'
import type { McpServer } from '@igstack/app-catalog-shared-core'
import { validateMcpServers } from '../modules/mcpCatalog/validateMcpServers'
import { getDbClient } from './client'
import { TABLE_SYNC_MAGAZINE } from './tableSyncMagazine'
import { tableSyncPrisma } from './tableSyncPrismaAdapter'
import { readFile, readdir, stat } from 'node:fs/promises'
import { group } from 'radashi'
import { upsertAsset } from '../modules/assets/upsertAsset'
import type { ApprovalMethod, Group, Person } from '../types'
import type { PrismaClient } from '../generated/prisma/client'
import { naturalSort } from '../utils/naturalSort'
import {
  pruneOrphanedSourceUrls,
  syncSourceLinks,
  syncSourceUrls,
} from '../modules/sources/sourcesDb'

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
  /** Omitted: MCP rows are left as they are. `[]`: all are removed. */
  mcpServers?: (McpServer | CatalogMcpServer)[]
}

/** A config source as a sync reference: bare URLs carry no schedule. */
function toSyncRef(source: string | SourceReference): SourceReference {
  // An enriched source's schedule is the autoupdate registry's copy, and it wins on every sync.
  const schedule = typeof source === 'string' ? {} : (source.schedule ?? {})
  return {
    url: typeof source === 'string' ? source : source.url,
    sourceSlug: undefined, // Will be derived in syncSourceUrls
    schedule: {
      lastCheckedAt: schedule.lastCheckedAt,
      nextCheckAfter: schedule.nextCheckAfter,
      lastContentChangeAt: schedule.lastContentChangeAt,
      checkIntervalHours: schedule.checkIntervalHours,
      changeHistory: schedule.changeHistory,
    },
  }
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

    // Validate MCP servers before the first write, so a bad record leaves the
    // whole catalog as it was. Owners not passed in come from the DB.
    const mcpServers = options?.mcpServers
    if (mcpServers) {
      const [persons, groups] = await Promise.all([
        options.persons ?? prisma.dbPerson.findMany({ select: { slug: true } }),
        options.groups ?? prisma.dbGroup.findMany({ select: { slug: true } }),
      ])
      validateMcpServers(mcpServers, {
        resourceSlugs: new Set(
          resources.map(
            (r) =>
              r.slug ||
              r.displayName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, ''),
          ),
        ),
        ownerSlugs: new Set([...persons, ...groups].map((o) => o.slug)),
      })
    }

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
        background: resource.background ?? null,
        tags: resource.tags ?? [],
        appUrl: resource.appUrl ?? null,
        links: resource.links ?? null,
        iconName: resource.iconName ?? null,
        screenshotIds: resource.screenshotIds ?? [],
        deprecated: resource.deprecated ?? null,
        aiPrompt: resource.aiPrompt ?? null,
        // aiMemory intentionally excluded from bulk sync — it is AI-owned and
        // preserved across restarts. Static-config values are seeded below (if DB is null).
        urlIssues: resource.urlIssues ?? [],
        tiers: resource.tiers ?? null,
        quickJumps: resource.quickJumps ?? null,
        claims: resource.claims ?? null,
        childrenLabel: resource.childrenLabel ?? null,
        // Fields from former SubResource
        parentSlug: resource.parentSlug ?? null,
        tier: resource.tier ?? null,
        aliases: resource.aliases ?? [],
        ownerPersonSlug: resource.ownerPersonSlug ?? null,
        approverSlugs: resource.approverSlugs ?? [],
        accessComments: resource.accessComments ?? null,
        extra: resource.extra ?? null,
        lastCheckedAt: resource.lastCheckedAt
          ? new Date(resource.lastCheckedAt)
          : null,
        nextCheckAfter: resource.nextCheckAfter
          ? new Date(resource.nextCheckAfter)
          : null,
        lastContentChangeAt: resource.lastContentChangeAt
          ? new Date(resource.lastContentChangeAt)
          : null,
        createdAt: resource.catalogAddedAt
          ? new Date(resource.catalogAddedAt)
          : undefined,
      }
    })

    // Sync resources
    const result = await sync.sync(dbResources)

    // Backfill catalogAddedAt → DB createdAt. Uses $executeRaw (not updateMany)
    // because Prisma's new client engine may treat @default(now()) fields as
    // server-managed and silently omit them from the SET clause. Raw SQL is the
    // only reliable path. The WHERE guard makes it idempotent: fires only when
    // the DB date is newer than catalogAddedAt (e.g. after a DB rebuild).
    for (const resource of resources) {
      if (!resource.catalogAddedAt) continue
      const addedAt = new Date(resource.catalogAddedAt)
      const slug =
        resource.slug ||
        resource.displayName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      await prisma.$executeRaw`
        UPDATE "DbResource"
        SET "createdAt" = ${addedAt}
        WHERE "slug" = ${slug} AND "createdAt" > ${addedAt}
      `
    }

    // Resolve slug -> id for synced resources so links can reference by resourceId
    const slugs = dbResources.map((a) => a.slug)
    const resourceRows = await prisma.dbResource.findMany({
      where: { slug: { in: slugs } },
      select: { slug: true, id: true },
    })
    const slugToId = Object.fromEntries(resourceRows.map((r) => [r.slug, r.id]))

    // Build all source references (URLs + schedules) from resources and MCP
    // servers together, so the prune below sees every cited URL.
    const allSourceRefs = [
      ...sortedResources.flatMap((r) => (r.sources ?? []).map(toSyncRef)),
      ...(mcpServers ?? []).flatMap((s) => s.sources.map(toSyncRef)),
    ]

    // Sync Source and SourceUrl rows
    await syncSourceUrls(prisma, allSourceRefs)

    // Build link rows (resource -> URL)
    const allLinkRows = sortedResources.flatMap((resource) => {
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
        return { owner: resourceId, url }
      })
    })

    // Collect all synced resource IDs to handle deletions
    const allOwnerIds = new Set(Object.values(slugToId))

    // Sync all resource->source links (set semantics: old links deleted, new links created)
    await syncSourceLinks(
      prisma,
      'DbResourceSourceUrl',
      'resourceId',
      allLinkRows,
      allOwnerIds,
    )

    if (mcpServers) {
      // Servers dropped from config are deleted; their links cascade.
      await tableSyncPrisma({
        prisma,
        ...TABLE_SYNC_MAGAZINE.DbMcpServer,
      }).sync(
        mcpServers.map((s) => ({
          slug: s.slug,
          displayName: s.displayName,
          description: s.description,
          category: s.category,
          aliases: s.aliases ?? [],
          status: s.status,
          access: s.access,
          writeNote: s.writeNote ?? null,
          sensitiveData: s.sensitiveData ?? null,
          requiredAppSlugs: s.requiredAppSlugs ?? [],
          auth: s.auth,
          transport: s.transport,
          tools: s.tools,
          ownerSlug: s.ownerSlug ?? null,
          support: s.support ?? null,
        })),
      )
      await syncSourceLinks(
        prisma,
        'DbMcpServerSourceUrl',
        'mcpServerSlug',
        mcpServers.flatMap((s) =>
          s.sources.map((source) => ({
            owner: s.slug,
            url: toSyncRef(source).url,
          })),
        ),
        new Set(mcpServers.map((s) => s.slug)),
      )
    }

    // Prune orphaned SourceUrl rows (URLs with no links)
    await pruneOrphanedSourceUrls(prisma)

    // Seed aiMemory only for resources where the static config provides an initial value
    // and the DB currently has none. This preserves AI-written updates across restarts.
    const resourcesWithAiMemorySeed = sortedResources.filter(
      (r) => r.aiMemory != null && r.aiMemory.trim() !== '',
    )
    if (resourcesWithAiMemorySeed.length > 0) {
      for (const resource of resourcesWithAiMemorySeed) {
        const slug =
          resource.slug ||
          resource.displayName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
        await prisma.dbResource.updateMany({
          where: { slug, aiMemory: null },
          data: { aiMemory: resource.aiMemory },
        })
      }
    }

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
