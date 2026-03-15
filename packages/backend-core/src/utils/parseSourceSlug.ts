export function parseSourceSlug(url: string): string {
  const lower = url.toLowerCase()
  if (lower.includes('atlassian.net')) return 'confluence'
  if (lower.includes('slack.com')) return 'slack'
  return 'unknown'
}
