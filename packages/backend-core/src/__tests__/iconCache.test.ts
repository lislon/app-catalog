import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerIconRestController } from '../modules/icons/iconRestController'
import * as dbClient from '../db/client'
import type { PrismaClient } from '../generated/prisma/client'
import type { Request, Response, Router } from 'express'

const ICON = {
  content: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
  mimeType: 'image/svg+xml',
  name: 'example-icon',
  checksum: 'abc123',
}

/**
 * Captures the `GET {basePath}/:name` handler the controller registers, so the
 * test can drive it directly instead of standing up an HTTP server.
 */
const captureBinaryHandler = () => {
  let handler!: (req: Request, res: Response) => Promise<void>
  const router = {
    get: (path: string, fn: (req: Request, res: Response) => Promise<void>) => {
      if (path === '/api/icons/:name') handler = fn
    },
    post: () => {},
  } as unknown as Router

  registerIconRestController(router, { basePath: '/api/icons' })
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
    sendStatus: vi.fn().mockReturnThis(),
  }
  return { res: res as unknown as Response, headers, spy: res }
}

describe('icon binary caching', () => {
  beforeEach(() => {
    vi.spyOn(dbClient, 'getDbClient').mockReturnValue({
      dbAsset: { findFirst: vi.fn().mockResolvedValue(ICON) },
    } as unknown as PrismaClient)
  })

  it('requires revalidation so a replaced icon is not masked by a stale cache', async () => {
    const handler = captureBinaryHandler()
    const { res, headers } = fakeRes()

    await handler(
      { params: { name: 'example-icon' }, headers: {} } as unknown as Request,
      res,
    )

    expect(headers['Cache-Control']).toBe('public, max-age=0, must-revalidate')
    expect(headers['ETag']).toBe(`"${ICON.checksum}"`)
  })

  it('answers a matching If-None-Match with 304 and no body', async () => {
    const handler = captureBinaryHandler()
    const { res, spy } = fakeRes()

    await handler(
      {
        params: { name: 'example-icon' },
        headers: { 'if-none-match': `"${ICON.checksum}"` },
      } as unknown as Request,
      res,
    )

    expect(spy.status).toHaveBeenCalledWith(304)
    expect(spy.send).not.toHaveBeenCalled()
  })
})
