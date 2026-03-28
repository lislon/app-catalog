export function parseSourceSlug(url: string): string {
  const lower = url.toLowerCase()
  if (lower.includes('atlassian.net') || lower.includes('confluence'))
    return 'confluence'
  if (lower.includes('slack.com')) return 'slack'
  if (lower.includes('gitlab.com') || lower.includes('gitlab.')) return 'gitlab'
  return 'external'
}
