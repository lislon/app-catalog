/**
 * Counts a click through to a tool's site. The page leaves in the same tab, which
 * would cancel a tRPC call, so this posts with `keepalive` and never waits for it.
 */
export function recordSiteOpen(slug: string): void {
  fetch(`${window.location.origin}/api/trpc/communityTools.recordSiteOpen`, {
    method: 'POST',
    keepalive: true,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ slug }),
  }).catch(() => {
    // A lost count never stops anyone reaching the site.
  })
}

/** Goes to the tool's site in this tab, counting the click. */
export function openSite(tool: { slug: string; url: string }): void {
  recordSiteOpen(tool.slug)
  window.location.assign(tool.url)
}
