import { describe, expect, it } from 'vitest'
import {
  STALE_GRACE_MS,
  computeFreshness,
} from '../modules/appCatalog/freshness'

const NOW = Date.parse('2026-07-30T00:00:00.000Z')
const iso = (msFromNow: number) => new Date(NOW + msFromNow).toISOString()
const DAY = 24 * 60 * 60 * 1000

describe('computeFreshness', () => {
  it('returns null dates and not-stale when never checked', () => {
    expect(computeFreshness({}, NOW)).toEqual({
      lastCheckedAt: null,
      lastContentChangeAt: null,
      isStale: false,
    })
    // nextCheckAfter present but never checked → still nothing to show
    expect(computeFreshness({ nextCheckAfter: iso(-30 * DAY) }, NOW)).toEqual({
      lastCheckedAt: null,
      lastContentChangeAt: null,
      isStale: false,
    })
  })

  it('is fresh when the next check is still in the future', () => {
    const r = computeFreshness(
      { lastCheckedAt: iso(-DAY), nextCheckAfter: iso(DAY) },
      NOW,
    )
    expect(r.isStale).toBe(false)
    expect(r.lastCheckedAt).toBe(iso(-DAY))
  })

  it('is fresh when overdue but within the grace period', () => {
    // due 3 days ago, grace is 7 days → not stale yet
    expect(
      computeFreshness(
        { lastCheckedAt: iso(-10 * DAY), nextCheckAfter: iso(-3 * DAY) },
        NOW,
      ).isStale,
    ).toBe(false)
  })

  it('is stale once past due by more than the grace period', () => {
    // due 8 days ago > 7-day grace → stale
    expect(
      computeFreshness(
        { lastCheckedAt: iso(-15 * DAY), nextCheckAfter: iso(-8 * DAY) },
        NOW,
      ).isStale,
    ).toBe(true)
  })

  it('treats exactly-grace as not yet stale (strictly greater than)', () => {
    const atBoundary = computeFreshness(
      {
        lastCheckedAt: iso(-8 * DAY),
        nextCheckAfter: new Date(NOW - STALE_GRACE_MS).toISOString(),
      },
      NOW,
    )
    expect(atBoundary.isStale).toBe(false)
  })

  it('is not stale when nextCheckAfter is missing (cannot judge overdue)', () => {
    expect(
      computeFreshness({ lastCheckedAt: iso(-100 * DAY) }, NOW).isStale,
    ).toBe(false)
  })

  it('ignores an unparseable nextCheckAfter', () => {
    expect(
      computeFreshness(
        { lastCheckedAt: iso(-DAY), nextCheckAfter: 'not-a-date' },
        NOW,
      ).isStale,
    ).toBe(false)
  })

  it('passes through when the content last actually changed', () => {
    // The UI shows this instead of lastCheckedAt: a source re-read 20 times
    // without changing was still "Updated" 90 days ago.
    const r = computeFreshness(
      {
        lastCheckedAt: iso(-DAY),
        nextCheckAfter: iso(DAY),
        lastContentChangeAt: iso(-90 * DAY),
      },
      NOW,
    )
    expect(r.lastContentChangeAt).toBe(iso(-90 * DAY))
    expect(r.lastCheckedAt).toBe(iso(-DAY))
  })

  it('leaves lastContentChangeAt null for entries predating the field', () => {
    // Older rows have no content-change timestamp; the frontend falls back to
    // lastCheckedAt rather than showing nothing.
    const r = computeFreshness({ lastCheckedAt: iso(-DAY) }, NOW)
    expect(r.lastContentChangeAt).toBeNull()
  })
})
