/** Parse a single cookie value from the Cookie header. */
export function getCookie(
  req: { headers: { cookie?: string } },
  name: string,
): string | undefined {
  const cookies = req.headers.cookie ?? ''
  if (!cookies) return undefined
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  return match?.[1] !== undefined ? decodeURIComponent(match[1]) : undefined
}
