import { describe, expect, it, vi } from 'vitest'
import { parseAssetMeta } from '../modules/assets/assetUtils'
import { upsertAsset } from '../modules/assets/upsertAsset'
import type { PrismaClient } from '../generated/prisma/client'

const SVG = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#123456"/></svg>',
)

describe('parseAssetMeta mime derivation', () => {
  it('serves SVG as image/svg+xml, not the invalid image/svg', async () => {
    const meta = await parseAssetMeta({
      buffer: SVG,
      originalFilename: 'example-icon.svg',
    })

    expect(meta.mimeType).toBe('image/svg+xml')
  })
})

const fakePrisma = (
  existing: {
    id: string
    mimeType: string
    checksum: string
  } | null,
) => {
  const update = vi.fn().mockResolvedValue(existing)
  const create = vi.fn().mockResolvedValue({ id: 'created' })
  const prisma = {
    dbAsset: {
      findUnique: vi.fn().mockResolvedValue(existing),
      update,
      create,
    },
  } as unknown as PrismaClient

  return { prisma, update, create }
}

describe('upsertAsset mimeType repair', () => {
  it('rewrites a stale mimeType on an already-stored asset (same bytes, wrong derivation)', async () => {
    const { checksum } = await parseAssetMeta({
      buffer: SVG,
      originalFilename: 'example-icon.svg',
    })

    const { prisma, update } = fakePrisma({
      id: 'existing',
      mimeType: 'image/svg',
      checksum,
    })

    const id = await upsertAsset({
      prisma,
      buffer: SVG,
      name: 'example-icon',
      originalFilename: 'example-icon.svg',
      assetType: 'icon',
    })

    expect(id).toBe('existing')
    expect(update).toHaveBeenCalledWith({
      where: { id: 'existing' },
      data: { mimeType: 'image/svg+xml' },
    })
  })

  it('leaves an already-correct asset untouched', async () => {
    const { checksum } = await parseAssetMeta({
      buffer: SVG,
      originalFilename: 'example-icon.svg',
    })

    const { prisma, update } = fakePrisma({
      id: 'existing',
      mimeType: 'image/svg+xml',
      checksum,
    })

    const id = await upsertAsset({
      prisma,
      buffer: SVG,
      name: 'example-icon',
      originalFilename: 'example-icon.svg',
      assetType: 'icon',
    })

    expect(id).toBe('existing')
    expect(update).not.toHaveBeenCalled()
  })
})

describe('upsertAsset content replacement', () => {
  const OLD_SVG = SVG
  const NEW_PNG = Buffer.from(
    // 1x1 transparent PNG
    '89504e470d0a1a0a0000000d494844520000000100000001080600000' +
      '01f15c4890000000a49444154789c6360000002000100ffff03000006' +
      '0005579259de0000000049454e44ae426082',
    'hex',
  )

  it('rewrites content/checksum/fileSize/mimeType when the stored asset name is reused for different bytes', async () => {
    const oldMeta = await parseAssetMeta({
      buffer: OLD_SVG,
      originalFilename: 'example-icon.svg',
    })
    const newMeta = await parseAssetMeta({
      buffer: NEW_PNG,
      originalFilename: 'example-icon.png',
    })

    const { prisma, update } = fakePrisma({
      id: 'existing',
      mimeType: oldMeta.mimeType,
      checksum: oldMeta.checksum,
    })

    const id = await upsertAsset({
      prisma,
      buffer: NEW_PNG,
      name: 'example-icon',
      originalFilename: 'example-icon.png',
      assetType: 'icon',
    })

    expect(id).toBe('existing')
    expect(update).toHaveBeenCalledWith({
      where: { id: 'existing' },
      data: {
        mimeType: 'image/png',
        content: new Uint8Array(NEW_PNG),
        checksum: newMeta.checksum,
        fileSize: newMeta.fileSize,
        width: newMeta.width,
        height: newMeta.height,
      },
    })
  })

  it('does not call update when the same bytes are re-synced (checksum unchanged)', async () => {
    const meta = await parseAssetMeta({
      buffer: OLD_SVG,
      originalFilename: 'example-icon.svg',
    })

    const { prisma, update } = fakePrisma({
      id: 'existing',
      mimeType: meta.mimeType,
      checksum: meta.checksum,
    })

    await upsertAsset({
      prisma,
      buffer: OLD_SVG,
      name: 'example-icon',
      originalFilename: 'example-icon.svg',
      assetType: 'icon',
    })

    expect(update).not.toHaveBeenCalled()
  })
})
