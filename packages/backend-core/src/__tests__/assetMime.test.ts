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

describe('upsertAsset mimeType repair', () => {
  const fakePrisma = (existing: { id: string; mimeType: string } | null) => {
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

  it('rewrites a stale mimeType on an already-stored asset', async () => {
    const { prisma, update } = fakePrisma({
      id: 'existing',
      mimeType: 'image/svg',
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
    const { prisma, update } = fakePrisma({
      id: 'existing',
      mimeType: 'image/svg+xml',
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
