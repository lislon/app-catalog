import type {
  AppForCatalog,
  GroupingTagDefinition,
} from '../types/common/appCatalogTypes'
import { getDbClient } from './client'
import { TABLE_SYNC_MAGAZINE } from './tableSyncMagazine'
import { tableSyncPrisma } from './tableSyncPrismaAdapter'
import { readFile, readdir, stat } from 'node:fs/promises'
import { group } from 'radashi'
import { upsertAsset } from '../modules/assets/upsertAsset'
import type { ApprovalMethod } from '../types'
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
  screenshotIds: Array<string>
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
): Promise<Array<string>> {
  try {
    const files = await readdir(dirPath)
    const sortedFiles = naturalSort(files)
    const assetIds: Array<string> = []

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
  apps: Array<AppForCatalog>,
  allAppsAssetsPath: string,
) {
  const appDirectories = await readdir(allAppsAssetsPath)
  const prisma = getDbClient()
  const bySlug = group(apps, (a) => a.slug)

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
        screenshotIds?: Array<string>
        iconName?: string | null
      } = {}

      if (screenshotIds.length > 0) {
        updateData.screenshotIds = screenshotIds
      }
      if (iconName !== null) {
        updateData.iconName = iconName
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.dbAppForCatalog.update({
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
 * Syncs app catalog data to the database using table sync.
 * This will create new apps, update existing ones, and delete any that are no longer in the input.
 *
 * Note: Call connectDb() before and disconnectDb() after if running in a script.
 */
export async function syncAppCatalog(
  apps: Array<AppForCatalog>,
  tagsDefinitions: Array<GroupingTagDefinition>,
  approvalMethods: Array<ApprovalMethod>,
  sreenshotsPath?: string,
): Promise<SyncAppCatalogResult> {
  try {
    const prisma = getDbClient()

    await tableSyncPrisma({
      prisma,
      ...TABLE_SYNC_MAGAZINE.DbApprovalMethod,
    }).sync(approvalMethods)

    const sync = tableSyncPrisma({
      prisma,
      ...TABLE_SYNC_MAGAZINE.DbAppForCatalog,
    })

    await tableSyncPrisma({
      prisma,
      ...TABLE_SYNC_MAGAZINE.DbAppTagDefinition,
    }).sync(tagsDefinitions)

    // Collect all unique source slugs for sync
    const uniqueSourceSlugs = new Set<string>()
    for (const app of apps) {
      for (const source of app.sources ?? []) {
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

    // Transform AppForCatalog to DbAppForCatalog format (scalar fields only)
    const dbApps = apps.map((app) => {
      const slug =
        app.slug ||
        app.displayName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')

      return {
        slug,
        displayName: app.displayName,
        description: app.description,
        teams: app.teams ?? [],
        accessRequest: app.accessRequest ?? null,
        notes: app.notes ?? null,
        tags: app.tags ?? [],
        appUrl: app.appUrl ?? null,
        links: app.links ?? null,
        iconName: app.iconName ?? null,
        screenshotIds: app.screenshotIds ?? [],
        deprecated: app.deprecated ?? null,
      }
    })

    // Flatten all sourceRefs into a single array for sync
    const allSourceRefs = apps.flatMap((app) => {
      const appSlug =
        app.slug ||
        app.displayName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')

      return (app.sources ?? []).map((source) => {
        const url = typeof source === 'string' ? source : source.url
        const sourceSlug = parseSourceSlug(url)
        return {
          appSlug,
          sourceSlug,
          url,
          parseDate: null,
          excerpts: [],
          userPrompt: null,
        }
      })
    })

    // Sync apps first
    const result = await sync.sync(dbApps)

    // Then sync all SourceReferences (with set semantics: old ones deleted, new ones created)
    await tableSyncPrisma({
      prisma,
      ...TABLE_SYNC_MAGAZINE.SourceReference,
    }).sync(allSourceRefs)

    // Get actual synced data to calculate stats
    const actual = result.getActual()

    if (sreenshotsPath) {
      await syncAssetsFromFileSystem(apps, sreenshotsPath)
    } else {
      console.warn('Do not sync screenhots')
    }

    return {
      created: actual.length - apps.length + (apps.length - actual.length),
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
