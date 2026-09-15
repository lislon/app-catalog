import { describe, expect, it } from 'vitest'
import { formatRelativeTime } from '../../../../modules/appCatalog/utils/formatRelativeTime'

describe('formatRelativeTime', () => {
  const now = Date.parse('2026-09-14T12:00:00.000Z')

  it('formats past instants', () => {
    expect(formatRelativeTime('2026-09-14T11:59:38.000Z', now)).toBe(
      '22 seconds ago',
    )
    expect(formatRelativeTime('2026-09-12T12:00:00.000Z', now)).toBe(
      '2 days ago',
    )
  })

  it('reads a future instant as "now"', () => {
    // The server writes the timestamp and the browser renders it; a clock a few
    // seconds apart must not produce "in 4 seconds" for something just posted.
    expect(formatRelativeTime('2026-09-14T12:00:04.000Z', now)).toBe('now')
  })

  it('returns an empty string for an unparseable value', () => {
    expect(formatRelativeTime('not a date', now)).toBe('')
  })
})
