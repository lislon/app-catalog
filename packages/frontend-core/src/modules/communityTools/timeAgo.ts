const DAY_MS = 24 * 60 * 60 * 1000

/** How long ago, in calendar days and up: "today", "3 days ago", "2 months ago". */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const day = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  const days = Math.max(0, Math.round((day(now) - day(new Date(iso))) / DAY_MS))
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 31) return `${days} days ago`
  if (days < 365) {
    const months = Math.floor(days / 30)
    return months === 1 ? '1 month ago' : `${months} months ago`
  }
  const years = Math.floor(days / 365)
  return years === 1 ? '1 year ago' : `${years} years ago`
}
