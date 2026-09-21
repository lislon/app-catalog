import { describe, expect, it } from 'vitest'
import { STALE_GRACE_MS } from '../modules/appCatalog/freshness'
import {
  cadenceOf,
  computeSourcePulse,
} from '../modules/appCatalog/sourcePulse'

const NOW = Date.parse('2026-09-19T12:00:00.000Z')
const DAY = 24 * 60 * 60 * 1000
const iso = (msFromNow: number) => new Date(NOW + msFromNow).toISOString()

describe('cadenceOf', () => {
  it('buckets an interval into the word a reader would use', () => {
    expect(cadenceOf(1)).toBe('hourly')
    expect(cadenceOf(6)).toBe('hourly')
    expect(cadenceOf(24)).toBe('daily')
    expect(cadenceOf(210)).toBe('weekly')
    expect(cadenceOf(700)).toBe('monthly')
    expect(cadenceOf(2160)).toBe('quarterly')
  })

  it('has no cadence for a source the loop has not scheduled', () => {
    expect(cadenceOf(null)).toBeNull()
    expect(cadenceOf(undefined)).toBeNull()
  })
})

describe('computeSourcePulse', () => {
  it('is never-checked when there is no lastChecked, whatever else is set', () => {
    const p = computeSourcePulse({ nextCheckAfter: iso(-30 * DAY) }, NOW)
    expect(p.state).toBe('never')
    expect(p.lastCheckedAt).toBeNull()
  })

  it('is ok while the next check is still ahead', () => {
    expect(
      computeSourcePulse(
        { lastCheckedAt: iso(-DAY), nextCheckAfter: iso(DAY) },
        NOW,
      ).state,
    ).toBe('ok')
  })

  it('is due when overdue but inside the grace period', () => {
    expect(
      computeSourcePulse(
        { lastCheckedAt: iso(-10 * DAY), nextCheckAfter: iso(-3 * DAY) },
        NOW,
      ).state,
    ).toBe('due')
  })

  it('is stale once overdue by more than the grace period', () => {
    expect(
      computeSourcePulse(
        { lastCheckedAt: iso(-20 * DAY), nextCheckAfter: iso(-9 * DAY) },
        NOW,
      ).state,
    ).toBe('stale')
  })

  it('agrees with the entry-level grace boundary (strictly greater than)', () => {
    expect(
      computeSourcePulse(
        {
          lastCheckedAt: iso(-8 * DAY),
          nextCheckAfter: new Date(NOW - STALE_GRACE_MS).toISOString(),
        },
        NOW,
      ).state,
    ).toBe('due')
  })

  it('cannot call a source overdue with no due date', () => {
    expect(
      computeSourcePulse({ lastCheckedAt: iso(-100 * DAY) }, NOW).state,
    ).toBe('ok')
  })

  it('prefers the absolute content-change stamp over the history', () => {
    const p = computeSourcePulse(
      {
        lastCheckedAt: iso(-DAY),
        lastContentChangeAt: iso(-90 * DAY),
        changeHistory: [{ date: iso(-DAY), changed: true }],
      },
      NOW,
    )
    expect(p.lastContentChangeAt).toBe(iso(-90 * DAY))
    expect(p.contentChangeIsLowerBound).toBe(false)
  })

  it('recovers the change date from the newest changed check', () => {
    const p = computeSourcePulse(
      {
        lastCheckedAt: iso(-DAY),
        changeHistory: [
          { date: iso(-DAY), changed: false },
          { date: iso(-10 * DAY), changed: true },
          { date: iso(-40 * DAY), changed: true },
        ],
      },
      NOW,
    )
    expect(p.lastContentChangeAt).toBe(iso(-10 * DAY))
    expect(p.contentChangeIsLowerBound).toBe(false)
  })

  it('reports a lower bound when the window holds only unchanged checks', () => {
    // The real change aged out of the capped window, so the honest answer is
    // "older than the oldest check we still have" — never an exact date.
    const p = computeSourcePulse(
      {
        lastCheckedAt: iso(-DAY),
        changeHistory: [
          { date: iso(-DAY), changed: false },
          { date: iso(-46 * DAY), changed: false },
        ],
      },
      NOW,
    )
    expect(p.lastContentChangeAt).toBe(iso(-46 * DAY))
    expect(p.contentChangeIsLowerBound).toBe(true)
  })

  it('has nothing to say about content change with no history at all', () => {
    const p = computeSourcePulse({ lastCheckedAt: iso(-DAY) }, NOW)
    expect(p.lastContentChangeAt).toBeNull()
    expect(p.contentChangeIsLowerBound).toBe(false)
  })

  it('orders checks newest-first and drops unparseable ones', () => {
    const p = computeSourcePulse(
      {
        lastCheckedAt: iso(-DAY),
        changeHistory: [
          { date: iso(-10 * DAY), changed: false },
          { date: 'not-a-date', changed: true },
          { date: iso(-DAY), changed: true },
        ],
      },
      NOW,
    )
    expect(p.checks.map((c) => c.date)).toEqual([iso(-DAY), iso(-10 * DAY)])
  })

  it('carries the cadence through from the interval', () => {
    const p = computeSourcePulse(
      { lastCheckedAt: iso(-DAY), checkIntervalHours: 210 },
      NOW,
    )
    expect(p.intervalHours).toBe(210)
    expect(p.cadence).toBe('weekly')
  })
})
