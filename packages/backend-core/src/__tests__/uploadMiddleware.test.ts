// @vitest-environment node
import express from 'express'
import type { AddressInfo } from 'node:net'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as dbClient from '../db/client'
import type { PrismaClient } from '../generated/prisma/client'
import { registerAssetRestController } from '../modules/assets/assetRestController'
import { upsertAsset } from '../modules/assets/upsertAsset'
import { registerIconRestController } from '../modules/icons/iconRestController'

vi.mock('../modules/assets/upsertAsset', () => ({
  upsertAsset: vi.fn().mockResolvedValue('id-1'),
}))

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

/**
 * Drives the real multer middleware over HTTP, so a multer major bump that
 * changes memoryStorage or fileFilter semantics fails here rather than on the
 * deployed upload endpoints.
 */
const startApp = async () => {
  const app = express()
  const router = express.Router()
  registerIconRestController(router, { basePath: '/api/icons' })
  registerAssetRestController(router, { basePath: '/api/assets' })
  app.use(router)
  const server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const { port } = server.address() as AddressInfo
  return { server, base: `http://127.0.0.1:${port}` }
}

/** What each route handed to persistence, normalised to one shape. */
const stored = {
  icon: () => create.mock.calls.map(([{ data }]) => data.content),
  asset: () => vi.mocked(upsertAsset).mock.calls.map(([a]) => a.buffer),
}

const create = vi.fn()

const upload = (url: string, field: string, file: Blob, filename: string) => {
  const form = new FormData()
  form.append('name', 'probe')
  form.append(field, file, filename)
  return fetch(url, { method: 'POST', body: form })
}

describe('upload endpoints (multer)', () => {
  let server: Awaited<ReturnType<typeof startApp>>['server']
  let base: string

  beforeEach(async () => {
    create.mockReset()
    vi.mocked(upsertAsset).mockClear()
    create.mockImplementation(({ data }) => ({
      id: 'id-1',
      createdAt: new Date(0),
      ...data,
    }))
    vi.spyOn(dbClient, 'getDbClient').mockReturnValue({
      dbAsset: { create },
    } as unknown as PrismaClient)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    ;({ server, base } = await startApp())
  })

  afterEach(() => {
    server.close()
    vi.mocked(console.error).mockRestore()
  })

  it.each([
    ['/api/icons/upload', 'icon'],
    ['/api/assets/upload', 'asset'],
  ] as const)(
    '%s stores an uploaded image in memory intact',
    async (path, field) => {
      const res = await upload(
        base + path,
        field,
        new Blob([PNG_1X1], { type: 'image/png' }),
        'probe.png',
      )

      expect(res.status).toBe(201)
      const [content] = stored[field]()
      expect(Buffer.from(content).equals(PNG_1X1)).toBe(true)
    },
  )

  it.each([
    ['/api/icons/upload', 'icon'],
    ['/api/assets/upload', 'asset'],
  ] as const)(
    '%s rejects a non-image before it reaches the DB',
    async (path, field) => {
      const res = await upload(
        base + path,
        field,
        new Blob(['hello'], { type: 'text/plain' }),
        'probe.txt',
      )

      expect(res.status).toBeGreaterThanOrEqual(400)
      expect(stored[field]()).toEqual([])
    },
  )
})
