import { createHash } from 'node:crypto'
import type { FormatEnum } from 'sharp'
import sharp from 'sharp'
import {
  getExtensionFromFilename,
  getMimeTypeFromExtension,
  isKnownImageMimeType,
} from '../icons/iconUtils'
import type { ParseAssetParams, ParseAssetReturn } from './assetRestController'

/**
 * Extract image dimensions from a buffer using sharp
 */
export async function getImageDimensions(
  buffer: Buffer,
): Promise<{ width?: number; height?: number }> {
  try {
    const metadata = await sharp(buffer).metadata()
    return {
      width: metadata.width,
      height: metadata.height,
    }
  } catch (error) {
    console.error('Error extracting image dimensions:', error)
    return { width: undefined, height: undefined }
  }
}

/**
 * Resize an image buffer to the specified dimensions
 * @param buffer - The image buffer to resize
 * @param width - Target width (optional)
 * @param height - Target height (optional)
 * @param format - Output format ('png', 'jpeg', 'webp'), auto-detected if not provided
 */
export async function resizeImage(
  buffer: Buffer,
  width?: number,
  height?: number,
  format?: 'png' | 'jpeg' | 'webp',
): Promise<Buffer> {
  let pipeline = sharp(buffer)

  // Apply resize if dimensions provided
  if (width || height) {
    pipeline = pipeline.resize({
      width,
      height,
      fit: 'inside',
      withoutEnlargement: true,
    })
  }

  // Apply format conversion if specified
  if (format === 'png') {
    pipeline = pipeline.png()
  } else if (format === 'webp') {
    pipeline = pipeline.webp()
  } else if (format === 'jpeg') {
    pipeline = pipeline.jpeg()
  }

  return pipeline.toBuffer()
}

/**
 * Generate SHA-256 checksum for a buffer
 */
export function generateChecksum(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

/**
 * Detect image format from mime type
 */
export function getImageFormat(
  mimeType: string,
): 'png' | 'webp' | 'jpeg' | null {
  if (mimeType.includes('png')) return 'png'
  if (mimeType.includes('webp')) return 'webp'
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpeg'
  return null
}

/**
 * Check if a mime type represents a raster image (not SVG)
 */
export function isRasterImage(mimeType: string): boolean {
  return mimeType.startsWith('image/') && !mimeType.includes('svg')
}

/**
 * The content type an asset is served (and stored) with.
 *
 * The filename's extension decides, because it is the one piece of the asset a
 * human chose and a reader can see. `sharp`'s detected format is only a fallback
 * for a file that arrived without a usable extension, and an unrecognised value
 * degrades to `application/octet-stream` rather than being turned into an
 * `image/<whatever-the-library-called-it>` type that no browser accepts.
 */
export function mimeTypeForAsset(
  filename: string | undefined,
  fallback?: string,
): string {
  const byExtension = getMimeTypeFromExtension(
    getExtensionFromFilename(filename ?? ''),
  )
  if (byExtension !== 'application/octet-stream') return byExtension
  if (fallback && isKnownImageMimeType(fallback)) return fallback.toLowerCase()
  return 'application/octet-stream'
}

/**
 * `<id>.png` -> `<id>`. Asset URLs may carry the file extension so that a
 * browser, a CDN and "save image as" all see the real file type; the stored id
 * itself never contains a dot, so stripping one is unambiguous.
 */
export function stripAssetExtension(id: string): string {
  return id.replace(/\.[A-Za-z0-9]+$/, '')
}

export async function parseAssetMeta(
  p: ParseAssetParams,
): Promise<ParseAssetReturn> {
  // Get image dimensions using our utility
  const { width, height, format, size } = await sharp(p.buffer).metadata()

  const formatToMime: Partial<Record<keyof FormatEnum, string>> = {
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    avif: 'image/avif',
    tiff: 'image/tiff',
    gif: 'image/gif',
    heif: 'image/heif',
    svg: 'image/svg+xml',
  }

  return {
    checksum: generateChecksum(p.buffer),
    width,
    height,
    mimeType: mimeTypeForAsset(
      p.originalFilename,
      format ? formatToMime[format] : undefined,
    ),
    fileSize: size || 0,
  }
}
