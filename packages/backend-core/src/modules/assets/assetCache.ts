import type { Request, Response } from 'express'

/**
 * Asset URLs are keyed by row id or by icon name, and `upsertAsset` replaces
 * content in place rather than inserting a new row — so the bytes behind a
 * given URL can change. A long `max-age` would then serve the old artwork for
 * the whole window (an icon replacement stayed invisible for a day). Revalidate
 * against the stored checksum instead: unchanged content still costs only a
 * conditional request answered with 304, and a replacement shows up at once.
 *
 * `variant` distinguishes derived renditions of the same row (a resize width,
 * for example) so they do not share one entity tag.
 */
export function setRevalidatingCacheHeaders(
  res: Response,
  checksum: string,
  variant?: string | number,
): string {
  const etag =
    variant === undefined ? `"${checksum}"` : `"${checksum}-${variant}"`

  res.setHeader('ETag', etag)
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate')

  return etag
}

export function isNotModified(req: Request, etag: string): boolean {
  return req.headers['if-none-match'] === etag
}
