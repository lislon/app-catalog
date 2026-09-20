/**
 * Per-SOURCE cadence + freshness, for the pulse mark in the Sources list.
 *
 * The sibling `freshness.ts` answers the same question one level up — for a whole
 * entry, collapsed to a single `isStale` boolean. A source is where the facts
 * actually live: each one carries its own adaptive interval and its own recent
 * check history, so "how volatile is this" and "is this reading current" are
 * per-source answers that an entry-level summary necessarily throws away.
 *
 * The staleness rule is deliberately the same one (`STALE_GRACE_MS` past due), so
 * a source cannot disagree with its entry about what "stale" means.
 */
import type {
  SourceCadence,
  SourceCheck,
  SourcePulse,
  SourcePulseState,
  SourceSchedule,
} from '../../types/common/appCatalogTypes'
import { STALE_GRACE_MS } from './freshness'

export type { SourceCadence, SourcePulse, SourcePulseState }

/**
 * Cadence buckets, by the source's own interval in hours. The boundaries are the
 * words a reader would use, not even divisions: anything re-read within a working
 * day is "daily", and everything past a month is "quarterly" because
 * `MAX_INTERVAL_HOURS` is ~90 days.
 */
const CADENCES: { withinHours: number; cadence: SourceCadence }[] = [
  { withinHours: 6, cadence: 'hourly' },
  { withinHours: 48, cadence: 'daily' },
  { withinHours: 240, cadence: 'weekly' },
  { withinHours: 720, cadence: 'monthly' },
  { withinHours: Number.POSITIVE_INFINITY, cadence: 'quarterly' },
]

export function cadenceOf(
  intervalHours: number | null | undefined,
): SourceCadence | null {
  if (intervalHours == null || !Number.isFinite(intervalHours)) return null
  return (
    CADENCES.find((c) => intervalHours <= c.withinHours)?.cadence ?? 'quarterly'
  )
}

function parse(date: string): number | null {
  const t = Date.parse(date)
  return Number.isNaN(t) ? null : t
}

export function computeSourcePulse(
  schedule: SourceSchedule,
  now: number = Date.now(),
): SourcePulse {
  // The history arrives as an opaque Json column, so the entry-level null check
  // is load-bearing however well-typed it looks here.
  const raw = (schedule.changeHistory ?? []) as (SourceCheck | null)[]
  const checks: SourceCheck[] = raw
    .filter((c): c is SourceCheck => c != null && parse(c.date) !== null)
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))

  const lastCheckedAt = schedule.lastCheckedAt ?? null
  const dueAt = schedule.nextCheckAfter ?? null
  const due = dueAt ? parse(dueAt) : null

  let state: SourcePulseState = 'ok'
  if (!lastCheckedAt) {
    state = 'never'
  } else if (due !== null && now > due) {
    state = now - due > STALE_GRACE_MS ? 'stale' : 'due'
  }

  // Three ways to answer "when did this last change", in descending honesty:
  // the loop's absolute stamp; the newest check that observed a change; or —
  // when the history window holds only unchanged checks — nothing better than
  // "before the oldest check we still have", because the window is capped and
  // the real change aged out of it.
  const absolute = schedule.lastContentChangeAt ?? null
  const observed = checks.find((c) => c.changed)?.date ?? null
  const oldestCheck = checks.at(-1)?.date ?? null
  const lastContentChangeAt = absolute ?? observed ?? oldestCheck

  return {
    state,
    intervalHours: schedule.checkIntervalHours ?? null,
    cadence: cadenceOf(schedule.checkIntervalHours),
    lastCheckedAt,
    dueAt,
    lastContentChangeAt,
    contentChangeIsLowerBound:
      absolute === null && observed === null && oldestCheck !== null,
    checks,
  }
}
