import { describe, expect, it } from 'vitest'
import {
  STALE_GRACE_MS,
  computeFreshness,
} from '../modules/appCatalog/freshness'

const NOW = Date.parse('2026-07-30T00:00:00.000Z')
const iso = (msFromNow: number) => new Date(NOW + msFromNow).toISOString()
const DAY = 24 * 60 * 60 * 1000

describe('computeFreshness', () => {
  it('returns null date and not-stale when never checked', () => {
    expect(computeFreshness(null, null, NOW)).toEqual({
      lastCheckedAt: null,
      isStale: false,
    })
    // nextCheckAfter present but never checked → still nothing to show
    expect(computeFreshness(null, iso(-30 * DAY), NOW)).toEqual({
      lastCheckedAt: null,
      isStale: false,
    })
  })

  it('is fresh when the next check is still in the future', () => {
    const r = computeFreshness(iso(-DAY), iso(DAY), NOW)
    expect(r.isStale).toBe(false)
    expect(r.lastCheckedAt).toBe(iso(-DAY))
  })

  it('is fresh when overdue but within the grace period', () => {
    // due 3 days ago, grace is 7 days → not stale yet
    expect(computeFreshness(iso(-10 * DAY), iso(-3 * DAY), NOW).isStale).toBe(
      false,
    )
  })

  it('is stale once past due by more than the grace period', () => {
    // due 8 days ago > 7-day grace → stale
    expect(computeFreshness(iso(-15 * DAY), iso(-8 * DAY), NOW).isStale).toBe(
      true,
    )
  })

  it('treats exactly-grace as not yet stale (strictly greater than)', () => {
    const dueAt = iso(-0) // due now
    // now - due === 0; push due back exactly grace → boundary is not stale
    const atBoundary = computeFreshness(
      iso(-8 * DAY),
      new Date(NOW - STALE_GRACE_MS).toISOString(),
      NOW,
    )
    expect(atBoundary.isStale).toBe(false)
    void dueAt
  })

  it('is not stale when nextCheckAfter is missing (cannot judge overdue)', () => {
    expect(computeFreshness(iso(-100 * DAY), null, NOW).isStale).toBe(false)
  })

  it('ignores an unparseable nextCheckAfter', () => {
    expect(computeFreshness(iso(-DAY), 'not-a-date', NOW).isStale).toBe(false)
  })
})
