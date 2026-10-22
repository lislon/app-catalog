import { describe, expect, it } from 'vitest'
import { openedAgo } from '~/modules/communityTools/ui/RecentChips'

describe('openedAgo', () => {
  // A Wednesday afternoon, local time.
  const now = new Date(2026, 9, 21, 15, 0)
  const at = (...args: [number, number, number, number, number, number?]) =>
    new Date(...args).toISOString()

  it('reads like the chip in the design', () => {
    expect(
      [
        at(2026, 9, 21, 14, 59, 40),
        at(2026, 9, 21, 14, 35),
        at(2026, 9, 21, 13, 0),
        at(2026, 9, 21, 0, 30),
        at(2026, 9, 20, 23, 0),
        at(2026, 9, 20, 9, 0),
        at(2026, 9, 19, 9, 0),
        at(2026, 9, 14, 9, 0),
      ].map((iso) => openedAgo(iso, now)),
    ).toEqual([
      'just now',
      '25 min ago',
      '2 h ago',
      '14 h ago',
      '16 h ago',
      'yesterday',
      'Mon',
      'Oct 14',
    ])
  })
})
