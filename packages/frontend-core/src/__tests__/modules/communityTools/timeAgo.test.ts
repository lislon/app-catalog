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
})
