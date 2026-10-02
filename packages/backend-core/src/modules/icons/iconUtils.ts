/**
 * Get file extension from MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const mimeMap: Record<string, string> = {
    'image/svg+xml': 'svg',
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/bmp': 'bmp',
    'image/tiff': 'tiff',
    'image/x-icon': 'ico',
    'image/vnd.microsoft.icon': 'ico',
  }

  return mimeMap[mimeType.toLowerCase()] || 'bin'
}

/**
 * Get file extension from filename
 */
export function getExtensionFromFilename(filename: string): string {
  const match = filename.match(/\.([^.]+)$/)
  return match?.[1]?.toLowerCase() || ''
}

const MIME_BY_EXTENSION: Record<string, string> = {
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
  bmp: 'image/bmp',
  tiff: 'image/tiff',
  heif: 'image/heif',
  ico: 'image/x-icon',
}

/**
 * Get MIME type from extension
 */
export function getMimeTypeFromExtension(extension: string): string {
  return (
    MIME_BY_EXTENSION[extension.toLowerCase()] || 'application/octet-stream'
  )
}

/**
 * Whether a MIME type is one we knowingly serve, rather than something invented
 * from an image library's format name (`image/svg`, `image/magick`). A browser
 * behind `X-Content-Type-Options: nosniff` refuses to render an invented type in
 * an `<img>`, so an unrecognised value must never reach a response header.
 */
export function isKnownImageMimeType(mimeType: string): boolean {
  return Object.values(MIME_BY_EXTENSION).includes(mimeType.toLowerCase())
}
