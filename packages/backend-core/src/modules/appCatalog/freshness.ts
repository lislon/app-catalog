/**
 * Freshness semantic for a catalog resource.
 *
 * The backend owns this calculation so the frontend stays dumb: it just renders
 * `lastCheckedAt` and, when `isStale` is true, a muted "may be out of date" note.
 *
 * Data source: the autoupdate scan records, per app, when its sources were last
 * verified (`lastCheckedAt`) and when the next check is due (`nextCheckAfter`,
 * adaptive backoff). "Stale" means the entry is more than a grace period past
 * its due date — i.e. the automated freshness loop has fallen behind for this
 * app, so a human reader should treat the info with mild caution.
 */

import type { Freshness } from '../../types/common/appCatalogTypes'

export type { Freshness }

/** A check is "stale" once it is this far past its due date (ms). Default: 7 days. */
export const STALE_GRACE_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Compute the freshness semantic from the stored dates.
 *
 * @param lastCheckedAt ISO string or null — when sources were last verified.
 * @param nextCheckAfter ISO string or null — when the next check is due.
 * @param now current time (defaults to Date.now()); injectable for tests.
 */
export function computeFreshness(
  lastCheckedAt: string | null,
  nextCheckAfter: string | null,
  now: number = Date.now(),
): Freshness {
  // Never checked → no line is shown at all (frontend hides null lastCheckedAt).
  if (!lastCheckedAt) {
    return { lastCheckedAt: null, isStale: false }
  }

  let isStale = false
  if (nextCheckAfter) {
    const due = Date.parse(nextCheckAfter)
    if (!Number.isNaN(due)) {
      isStale = now - due > STALE_GRACE_MS
    }
  }

  return { lastCheckedAt, isStale }
}
