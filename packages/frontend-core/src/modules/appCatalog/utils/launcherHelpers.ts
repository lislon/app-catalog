import type { Resource } from '@igstack/app-catalog-backend-core'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/**
 * "New this week" = apps ADDED to the catalog in the last 7 days, newest first.
 *
 * Deliberately ignores `freshness.lastContentChangeAt` / `lastCheckedAt`: those
 * come from the periodic freshness job, so a months-old app that was merely
 * re-verified would surface as "new" (#96). `createdAt` is the DB column that
 * `syncAppCatalog` backfills from the static config's `catalogAddedAt`, and it
 * is what the card's own "Added …" label shows — so the section and the card
 * now agree. Apps with no `createdAt` are excluded.
 */
export function pickNewThisWeek(
  apps: Resource[],
  now: number = Date.now(),
  limit = 6,
): Resource[] {
  const weekAgo = now - WEEK_MS
  const addedAt = (a: Resource) =>
    a.createdAt ? new Date(a.createdAt).getTime() : Number.NaN

  return apps
    .filter((a) => addedAt(a) >= weekAgo)
    .sort((a, b) => addedAt(b) - addedAt(a))
    .slice(0, limit)
}
