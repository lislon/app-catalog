/**
 * Freshness semantic for a catalog resource.
 *
 * The backend owns this calculation so the frontend stays dumb: it just renders
 * `lastContentChangeAt` (falling back to `lastCheckedAt`) and, when `isStale` is
 * true, a muted "may be out of date" note.
 *
 * Data source: the autoupdate scan records, per app, when its sources were last
 * verified (`lastCheckedAt`), when their content last actually changed
 * (`lastContentChangeAt`), and when the next check is due (`nextCheckAfter`,
 * adaptive backoff). The two "last" dates are deliberately distinct — a source
 * can be re-read many times without changing, so "checked" is not "updated".
 * "Stale" means the entry is more than a grace period past its due date — i.e.
 * the automated freshness loop has fallen behind for this app, so a human reader
 * should treat the info with mild caution.
 */

import type { Freshness } from '../../types/common/appCatalogTypes'

export type { Freshness }

/** A check is "stale" once it is this far past its due date (ms). Default: 7 days. */
export const STALE_GRACE_MS = 7 * 24 * 60 * 60 * 1000

/** The stored dates a resource's freshness is computed from (ISO strings). */
export interface FreshnessInput {
  /** When the sources were last verified — only means the schedule advanced. */
  lastCheckedAt?: string | null
  /** When the next check is due (adaptive backoff). */
  nextCheckAfter?: string | null
  /** When the source content last actually changed. Null on pre-existing rows. */
  lastContentChangeAt?: string | null
}

/**
 * Compute the freshness semantic from the stored dates.
 *
 * @param dates the resource's stored freshness timestamps.
 * @param now current time (defaults to Date.now()); injectable for tests.
 */
export function computeFreshness(
  dates: FreshnessInput,
  now: number = Date.now(),
): Freshness {
  const { lastCheckedAt, nextCheckAfter, lastContentChangeAt } = dates

  // Never checked → no line is shown at all (frontend hides null lastCheckedAt).
  if (!lastCheckedAt) {
    return { lastCheckedAt: null, lastContentChangeAt: null, isStale: false }
  }

  let isStale = false
  if (nextCheckAfter) {
    const due = Date.parse(nextCheckAfter)
    if (!Number.isNaN(due)) {
      isStale = now - due > STALE_GRACE_MS
    }
  }

  return {
    lastCheckedAt,
    lastContentChangeAt: lastContentChangeAt ?? null,
    isStale,
  }
}
