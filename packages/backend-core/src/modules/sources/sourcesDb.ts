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
 * Schedule fields come from `ref.schedule`. Dedupes by URL, preferring entries with schedules.
 */
export async function syncSourceUrls(
  prisma: PrismaClient,
  refs: SourceReference[],
): Promise<void> {
  // Dedupe by URL, preferring entries with schedules over bare strings
  const urlMap = new Map<string, SourceReference>()
  const hasScheduleData = (ref: SourceReference) =>
    ref.schedule?.checkIntervalHours != null ||
    ref.schedule?.nextCheckAfter != null ||
    ref.schedule?.lastCheckedAt != null ||
    ref.schedule?.lastContentChangeAt != null ||
    ref.schedule?.changeHistory != null

  for (const ref of refs) {
    const existing = urlMap.get(ref.url)
    // Prefer the entry that carries actual schedule data
    if (!existing || (!hasScheduleData(existing) && hasScheduleData(ref))) {
      urlMap.set(ref.url, ref)
    }
  }

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

  for (const ref of urlMap.values()) {
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
 * Handles empty owner sets (deletes all links for owners not in the synced set).
 * @param model - 'DbResourceSourceUrl' (or 'DbMcpServerSourceUrl' in a later task)
 * @param ownerColumn - the FK column name ('resourceId' or 'mcpServerSlug')
 * @param rows - array of { owner: string, url: string }
 * @param allOwners - optional set of all owners being synced; links for owners not in this set are deleted
 */
export async function syncSourceLinks<TModel extends 'DbResourceSourceUrl'>(
  prisma: PrismaClient,
  model: TModel,
  ownerColumn: string,
  rows: { owner: string; url: string }[],
  allOwners?: Set<string>,
): Promise<void> {
  const modelOps = prisma[
    (model.charAt(0).toLowerCase() + model.slice(1)) as keyof typeof prisma
  ] as any

  // Group rows by owner, deduping URLs per owner
  const byOwner = new Map<string, Set<string>>()
  for (const { owner, url } of rows) {
    if (!byOwner.has(owner)) {
      byOwner.set(owner, new Set())
    }
    byOwner.get(owner)!.add(url)
  }

  // Collect all owners that have links in this sync
  const ownersWithLinks = new Set(byOwner.keys())

  // Determine which owners need deletion: either in allOwners but not in rows, or in rows
  const ownersToSync = allOwners
    ? Array.from(allOwners)
    : Array.from(ownersWithLinks)

  // Build all link rows to create
  const allLinkRows: any[] = []
  for (const [owner, urlSet] of byOwner) {
    for (const url of urlSet) {
      allLinkRows.push({ [ownerColumn]: owner, url })
    }
  }

  // Batch: one deleteMany for all affected owners, one createMany for all links
  await prisma.$transaction([
    modelOps.deleteMany({
      where: { [ownerColumn]: { in: ownersToSync } },
    }),
    ...(allLinkRows.length > 0
      ? [
          modelOps.createMany({
            data: allLinkRows,
            skipDuplicates: true,
          }),
        ]
      : []),
  ])
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

/**
 * Prunes orphaned SourceUrl rows (URLs with no links from any owner).
 * Call this at the end of the boot sync only, not in updateApp.
 */
export async function pruneOrphanedSourceUrls(
  prisma: PrismaClient,
): Promise<void> {
  await prisma.sourceUrl.deleteMany({
    where: { resourceLinks: { none: {} } },
  })
}

function asDate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const parsed = new Date(iso)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}
