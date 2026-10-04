// @vitest-environment node
import express from 'express'
import type { AddressInfo } from 'node:net'
import sharp from 'sharp'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as dbClient from '../db/client'
import type { PrismaClient } from '../generated/prisma/client'
import { registerFeedbackAttachmentController } from '../modules/feedback/feedbackAttachmentController'

/**
 * Drives the real route over HTTP — multer, sharp and all — because every property
 * worth asserting here is about what the middleware chain does to bytes a stranger
 * supplied, and a unit test of the handler alone would skip all of it.
 */
const startApp = async () => {
  const app = express()
  const router = express.Router()
  registerFeedbackAttachmentController(router, {
    basePath: '/api/feedback-attachments',
  })
  app.use(router)
  const server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const { port } = server.address() as AddressInfo
  return { server, base: `http://127.0.0.1:${port}` }
}

const create = vi.fn()
const deleteMany = vi.fn()

/** The bytes handed to persistence — i.e. what would actually be stored. */
const storedRows = () => create.mock.calls.map(([{ data }]) => data)

const postImages = (
  base: string,
  files: { body: Buffer; type: string; name: string }[],
  cookie?: string,
) => {
  const form = new FormData()
  for (const f of files) {
    form.append(
      'image',
      new Blob([new Uint8Array(f.body)], { type: f.type }),
      f.name,
    )
  }
  return fetch(`${base}/api/feedback-attachments/upload`, {
    method: 'POST',
    body: form,
    headers: cookie ? { cookie } : {},
  })
}

/** The visitor cookie the first response minted, in a form fetch will send back. */
const visitorCookie = (res: Response): string => {
  const raw = res.headers.getSetCookie().find((c) => c.startsWith('ac_cid='))
  return raw ? (raw.split(';')[0] ?? '') : ''
}

const png = (width: number, height: number) =>
  sharp({
    create: { width, height, channels: 3, background: { r: 10, g: 20, b: 30 } },
  })
    .png()
    .toBuffer()

describe('feedback attachment upload', () => {
  let server: Awaited<ReturnType<typeof startApp>>['server']
  let base: string

  beforeEach(async () => {
    create.mockReset()
    deleteMany.mockReset()
    deleteMany.mockResolvedValue({ count: 0 })
    create.mockImplementation(({ data }) => ({
      id: `att-${create.mock.calls.length}`,
      ...data,
    }))
    vi.spyOn(dbClient, 'getDbClient').mockReturnValue({
      dbFeedbackAttachment: { create, deleteMany },
    } as unknown as PrismaClient)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    ;({ server, base } = await startApp())
  })

  afterEach(() => {
    server.close()
    vi.mocked(console.error).mockRestore()
  })

  /**
   * The whole security model in one assertion: nothing a visitor uploads is ever the
   * thing we store. Decoding to pixels and re-encoding is what drops EXIF, trailing
   * data and anything polyglot — a content-type check would wave all of it through.
   */
  it('stores its own re-encoded webp, never the uploaded bytes', async () => {
    const original = await png(120, 80)
    const res = await postImages(base, [
      { body: original, type: 'image/png', name: 'shot.png' },
    ])

    expect(res.status).toBe(201)
    const [row] = storedRows()
    expect(row.mimeType).toBe('image/webp')
    expect(Buffer.from(row.content).equals(original)).toBe(false)
    // Really a webp, by its own magic bytes rather than by what we labelled it.
    expect(Buffer.from(row.content).subarray(8, 12).toString()).toBe('WEBP')
    expect(row.width).toBe(120)
    expect(row.height).toBe(80)
    expect(row.fileSize).toBe(row.content.byteLength)
  })

  it('rasterises a script-bearing SVG, so no script survives storage', async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40">' +
        '<rect width="40" height="40" fill="green"/><script>alert(1)</script></svg>',
    )
    const res = await postImages(base, [
      { body: svg, type: 'image/svg+xml', name: 'logo.svg' },
    ])

    expect(res.status).toBe(201)
    const [row] = storedRows()
    expect(row.mimeType).toBe('image/webp')
    expect(Buffer.from(row.content).includes('alert')).toBe(false)
  })

  it('refuses something that is not an image, whatever it claims to be', async () => {
    const res = await postImages(base, [
      { body: Buffer.from('just text'), type: 'image/png', name: 'fake.png' },
    ])

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error: 'Not a readable image: fake.png',
    })
    expect(storedRows()).toHaveLength(0)
  })

  /**
   * Multer's limit errors used to reach express's default handler, which answers a
   * public endpoint with an HTML stack trace carrying absolute server paths.
   */
  it('answers its own limits as JSON, with no stack trace', async () => {
    const small = await png(10, 10)
    const res = await postImages(
      base,
      Array.from({ length: 4 }, (_, i) => ({
        body: small,
        type: 'image/png',
        name: `s${i}.png`,
      })),
    )

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Up to 3 images' })
    expect(res.headers.get('content-type')).toContain('application/json')
  })

  it('records the uploader, and leaves the image unclaimed until it is submitted', async () => {
    const res = await postImages(base, [
      { body: await png(20, 20), type: 'image/png', name: 'a.png' },
    ])

    expect(res.status).toBe(201)
    const [row] = storedRows()
    expect(row.authorHash).toMatch(/^[0-9a-f]{16,}$/)
    // Unset on purpose: the feedback row does not exist yet, so abandoning the form
    // leaves an orphan image rather than half-written feedback.
    expect(row.feedbackId).toBeUndefined()
  })

  it('cuts a browser off after its hourly budget', async () => {
    const small = await png(8, 8)
    const file = { body: small, type: 'image/png', name: 'r.png' }

    // The first request mints the visitor; reusing its cookie is what makes the
    // remaining 20 count against ONE browser rather than twenty strangers.
    const first = await postImages(base, [file])
    expect(first.status).toBe(201)
    const cookie = visitorCookie(first)
    expect(cookie).not.toBe('')

    const codes = [first.status]
    for (let i = 0; i < 20; i++) {
      codes.push((await postImages(base, [file], cookie)).status)
    }

    expect(codes.filter((c) => c === 201)).toHaveLength(20)
    expect(codes.at(-1)).toBe(429)
  })
})
