import { describe, expect, it } from 'vitest'
import { timeAgo } from '~/modules/communityTools/timeAgo'

describe('timeAgo', () => {
  const now = new Date(2026, 9, 21, 9, 0)
  const before = (days: number) =>
    new Date(2026, 9, 21 - days, 23, 30).toISOString()

  it('counts calendar days, then months, then years', () => {
    expect(
      [0, 1, 3, 30, 31, 61, 364, 365, 800].map((d) => timeAgo(before(d), now)),
    ).toEqual([
      'today',
      'yesterday',
      '3 days ago',
      '30 days ago',
      '1 month ago',
      '2 months ago',
      '12 months ago',
      '1 year ago',
      '2 years ago',
    ])
  })

  it('reads a time in the future as today', () => {
    expect(timeAgo(new Date(2026, 9, 22).toISOString(), now)).toBe('today')
  })

  it('buckets by local calendar day, stable across late-evening and after-midnight', () => {
    // Reproduces the flaky test bug: "3 days ago" must stay "3 days ago" at
    // 23:30 and 00:30 local time, even across DST boundaries.
    const lateEvening = new Date('2026-11-02T23:30:00-08:00') // before midnight
    const afterMidnight = new Date('2026-11-03T00:30:00-08:00') // after midnight
    const threeDaysAgo = (from: Date) => {
      const d = new Date(from)
      d.setDate(d.getDate() - 3)
      return d.toISOString()
    }
    expect(timeAgo(threeDaysAgo(lateEvening), lateEvening)).toBe('3 days ago')
    expect(timeAgo(threeDaysAgo(afterMidnight), afterMidnight)).toBe(
      '3 days ago',
    )
  })
})
