import { parseAssetMeta } from './assetUtils'
import type { AssetType, PrismaClient } from '../../generated/prisma/client'

export interface UpsertAssetParams {
  prisma: PrismaClient
  buffer: Buffer
  name: string
  originalFilename: string
  assetType: AssetType
}

export async function upsertAsset({
  prisma,
  buffer,
  name,
  originalFilename,
  assetType,
}: UpsertAssetParams) {
  const { checksum, fileSize, width, height, mimeType } = await parseAssetMeta({
    buffer,
    originalFilename,
  })

  const existing = await prisma.dbAsset.findUnique({
    where: { name },
  })

  if (existing) {
    // The checksum is the source of truth for whether the underlying bytes
    // changed. Reusing the stored binary on a checksum match must not keep a
    // mimeType we no longer derive: rows written by an older, wrong
    // derivation would never be corrected otherwise. A checksum mismatch
    // means the file on disk was replaced with different content (e.g. an
    // SVG swapped for a PNG) — the whole row must be rewritten, not just
    // mimeType, or the new bytes are silently discarded forever.
    if (existing.checksum !== checksum) {
      await prisma.dbAsset.update({
        where: { id: existing.id },
        data: {
          content: new Uint8Array(buffer),
          checksum,
          fileSize,
          width,
          height,
          mimeType,
        },
      })
    } else if (existing.mimeType !== mimeType) {
      await prisma.dbAsset.update({
        where: { id: existing.id },
        data: { mimeType },
      })
    }
    return existing.id
  }

  const asset = await prisma.dbAsset.create({
    data: {
      name,
      checksum,
      assetType,
      content: new Uint8Array(buffer),
      mimeType,
      fileSize,
      width,
      height,
    },
  })
  return asset.id
}
