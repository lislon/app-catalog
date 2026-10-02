import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Request, Response, Router } from 'express'
import * as dbClient from '../db/client'
import type { PrismaClient } from '../generated/prisma/client'
import {
  mimeTypeForAsset,
  parseAssetMeta,
  stripAssetExtension,
} from '../modules/assets/assetUtils'
import { registerIconRestController } from '../modules/icons/iconRestController'
import { registerScreenshotRestController } from '../modules/assets/screenshotRestController'

describe('mimeTypeForAsset', () => {
  it('takes the type from the extension, not from a wrong stored value', () => {
    expect(mimeTypeForAsset('logo.svg', 'image/svg')).toBe('image/svg+xml')
    expect(mimeTypeForAsset('shot.png', 'image/jpeg')).toBe('image/png')
  })

  it('falls back to the stored type only when the name has no usable extension', () => {
    expect(mimeTypeForAsset('logo', 'image/png')).toBe('image/png')
    expect(mimeTypeForAsset(undefined, 'image/png')).toBe('image/png')
  })

  it('never passes through an invented type', () => {
    // What the old `image/${format}` fallback produced. A browser behind
    // nosniff refuses these, so they must not reach a response header.
    expect(mimeTypeForAsset('logo', 'image/svg')).toBe(
      'application/octet-stream',
    )
    expect(mimeTypeForAsset('logo', 'image/magick')).toBe(
      'application/octet-stream',
    )
    expect(mimeTypeForAsset('logo')).toBe('application/octet-stream')
  })
})

describe('stripAssetExtension', () => {
  it('lets an asset URL carry the file extension', () => {
    expect(stripAssetExtension('ckl1234abcd.png')).toBe('ckl1234abcd')
    expect(stripAssetExtension('ckl1234abcd')).toBe('ckl1234abcd')
  })
})

describe('parseAssetMeta', () => {
  const SVG = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"/>',
  )

  it('derives the stored type from the uploaded filename', async () => {
    const meta = await parseAssetMeta({
      buffer: SVG,
      originalFilename: 'example-icon.svg',
    })

    expect(meta.mimeType).toBe('image/svg+xml')
  })

  it('does not invent a type for a file that arrives without an extension', async () => {
    const meta = await parseAssetMeta({
      buffer: SVG,
      originalFilename: 'example-icon',
    })

    // sharp reports format 'svg' here, which the mapping knows; what must never
    // happen is an unmapped format becoming `image/<format>`.
    expect(meta.mimeType).toBe('image/svg+xml')
    expect(meta.mimeType).not.toMatch(/^image\/svg$/)
  })
})

/**
 * Captures a `GET` handler a controller registers, so the test can drive it
 * without standing up an HTTP server.
 */
const captureHandler = (
  register: (router: Router) => void,
  path: string,
): ((req: Request, res: Response) => Promise<void>) => {
  let handler!: (req: Request, res: Response) => Promise<void>
  const router = {
    get: (p: string, fn: (req: Request, res: Response) => Promise<void>) => {
      if (p === path) handler = fn
    },
    post: () => {},
  } as unknown as Router

  register(router)
  return handler
}

const fakeRes = () => {
  const headers: Record<string, string> = {}
  const res = {
    setHeader: (k: string, v: string) => {
      headers[k] = v
    },
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
  }
  return { res: res as unknown as Response, headers, spy: res }
}

describe('serving an asset stored with a wrong mimeType', () => {
  // A row written by the old derivation: the bytes and the name are fine, the
  // persisted type is the invalid `image/svg` that nosniff rejects.
  const LEGACY_ICON = {
    content: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
    mimeType: 'image/svg',
    name: 'example-icon.svg',
    checksum: 'abc123',
  }

  beforeEach(() => {
    vi.spyOn(dbClient, 'getDbClient').mockReturnValue({
      dbAsset: {
        findFirst: vi.fn().mockResolvedValue(LEGACY_ICON),
        // Only the bare id exists — so a request for `<id>.svg` is found only if
        // the route stripped the extension before the lookup.
        findUnique: vi.fn(({ where }: { where: { id: string } }) =>
          Promise.resolve(where.id === 'ckl1234abcd' ? LEGACY_ICON : null),
        ),
      },
    } as unknown as PrismaClient)
  })

  it('serves the icon as image/svg+xml anyway', async () => {
    const handler = captureHandler(
      (router) =>
        registerIconRestController(router, { basePath: '/api/icons' }),
      '/api/icons/:name',
    )
    const { res, headers } = fakeRes()

    await handler(
      {
        params: { name: 'example-icon.svg' },
        headers: {},
      } as unknown as Request,
      res,
    )

    expect(headers['Content-Type']).toBe('image/svg+xml')
  })

  it('serves a screenshot by an extension-bearing URL', async () => {
    const handler = captureHandler(
      (router) =>
        registerScreenshotRestController(router, {
          basePath: '/api/screenshots',
        }),
      '/api/screenshots/:id',
    )
    const { res, headers, spy } = fakeRes()

    await handler(
      {
        params: { id: 'ckl1234abcd.svg' },
        query: {},
        headers: {},
      } as unknown as Request,
      res,
    )

    expect(spy.status).not.toHaveBeenCalledWith(404)
    expect(headers['Content-Type']).toBe('image/svg+xml')
  })
})
