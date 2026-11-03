/**
 * Shared sources module: upserts SourceUrl and Source, syncs link tables, and
 * reads sources back as SourceReference (with pulse).
 */

import type { PrismaClient, SourceUrl } from '../../generated/prisma/client'
import type {
  SourceCheck,
  SourceReference,
} from '../../types/common/appCatalogTypes'
import { parseSourceSlug } from '../../utils/parseSourceSlug'
import { computeSourcePulse } from '../appCatalog/sourcePulse'
import { tableSyncPrisma } from '../../db/tableSyncPrismaAdapter'
import { TABLE_SYNC_MAGAZINE } from '../../db/tableSyncMagazine'

/**
 * Upserts Source and SourceUrl rows from a list of references (from config + registry).
 * Schedule fields come from `ref.schedule`.
 */
export async function syncSourceUrls(
  prisma: PrismaClient,
  refs: SourceReference[],
): Promise<void> {
  // Collect unique sources and URLs
  const sourceSlugSet = new Set<string>()
  const urlData: {
    url: string
    sourceSlug: string
    excerpts: string[]
    lastCheckedAt: Date | null
    nextCheckAfter: Date | null
    lastContentChangeAt: Date | null
    checkIntervalHours: number | null
    changeHistory: unknown | null
  }[] = []

  for (const ref of refs) {
    const sourceSlug = ref.sourceSlug ?? parseSourceSlug(ref.url)
    sourceSlugSet.add(sourceSlug)

    const schedule = ref.schedule ?? {}
    urlData.push({
      url: ref.url,
      sourceSlug,
      excerpts: [],
      lastCheckedAt: asDate(schedule.lastCheckedAt),
      nextCheckAfter: asDate(schedule.nextCheckAfter),
      lastContentChangeAt: asDate(schedule.lastContentChangeAt),
      checkIntervalHours: schedule.checkIntervalHours ?? null,
      changeHistory: schedule.changeHistory ?? null,
    })
  }

  // Upsert all Source rows
  const sourceSlugs = Array.from(sourceSlugSet)
  for (const sourceSlug of sourceSlugs) {
    await prisma.source.upsert({
      where: { slug: sourceSlug },
      create: { slug: sourceSlug },
      update: {},
    })
  }

  // Upsert all SourceUrl rows (using tableSyncPrisma for upsert-only semantics)
  await tableSyncPrisma({
    prisma,
    ...TABLE_SYNC_MAGAZINE.SourceUrl,
  }).sync(urlData)
}

/**
 * Syncs a link table with set semantics: removes old links, adds new links.
 * @param model - 'DbResourceSourceUrl' (or 'DbMcpServerSourceUrl' in a later task)
 * @param ownerColumn - the FK column name ('resourceId' or 'mcpServerSlug')
 * @param rows - array of { owner: string, url: string }
 */
export async function syncSourceLinks<TModel extends 'DbResourceSourceUrl'>(
  prisma: PrismaClient,
  model: TModel,
  ownerColumn: string,
  rows: { owner: string; url: string }[],
): Promise<void> {
  // Group rows by owner for per-owner sync
  const byOwner = new Map<string, string[]>()
  for (const { owner, url } of rows) {
    if (!byOwner.has(owner)) {
      byOwner.set(owner, [])
    }
    byOwner.get(owner)!.push(url)
  }

  // Sync each owner's links independently
  for (const [owner, urls] of byOwner) {
    // Manually handle deletes for models with composite keys
    const linkRows = urls.map((url) => ({
      [ownerColumn]: owner,
      url,
    }))

    // Delete all existing links for this owner
    const modelOps = prisma[
      (model.charAt(0).toLowerCase() + model.slice(1)) as keyof PrismaClient
    ] as any
    await modelOps.deleteMany({
      where: { [ownerColumn]: owner },
    })

    // Create all new links
    if (linkRows.length > 0) {
      await modelOps.createMany({
        data: linkRows,
      })
    }
  }
}

/**
 * Converts a SourceUrl row (from Prisma) to the SourceReference TS type,
 * including the computed `pulse`.
 */
export function toSourceReference(row: SourceUrl): SourceReference {
  return {
    sourceSlug: row.sourceSlug,
    url: row.url,
    parseDate: null,
    pulse: computeSourcePulse({
      lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null,
      nextCheckAfter: row.nextCheckAfter?.toISOString() ?? null,
      lastContentChangeAt: row.lastContentChangeAt?.toISOString() ?? null,
      checkIntervalHours: row.checkIntervalHours,
      changeHistory: row.changeHistory as SourceCheck[] | null,
    }),
  }
}

function asDate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const parsed = new Date(iso)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}
