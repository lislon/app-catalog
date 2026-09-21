/**
 * Format an ISO timestamp as a short, human relative phrase ("2 days ago").
 * Used for the muted "Last checked …" line on the app detail view.
 *
 * Kept tiny and dependency-free (Intl.RelativeTimeFormat) — the frontend has no
 * date library and this is the only place that needs relative time.
 */
const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: 'second' },
  { amount: 60, unit: 'minute' },
  { amount: 24, unit: 'hour' },
  { amount: 7, unit: 'day' },
  { amount: 4.34524, unit: 'week' },
  { amount: 12, unit: 'month' },
  { amount: Number.POSITIVE_INFINITY, unit: 'year' },
]

/**
 * @param allowFuture keep a future date in the future ("in 3 days"). Off by
 *   default because almost every timestamp we render already happened; a due
 *   date is the exception.
 */
export function formatRelativeTime(
  iso: string,
  now: number = Date.now(),
  allowFuture = false,
): string {
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return ''
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  // Every timestamp we render already happened, so clamp the future away: a
  // server clock a few seconds ahead of the browser otherwise turns a comment
  // posted a moment ago into "in 4 seconds".
  const elapsed = (then - now) / 1000
  let duration = allowFuture ? elapsed : Math.min(0, elapsed) // seconds, negative for the past
  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return rtf.format(Math.round(duration), division.unit)
    }
    duration /= division.amount
  }
  return rtf.format(Math.round(duration), 'year')
}
