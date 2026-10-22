// @vitest-environment node
import sharp from 'sharp'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import type { User } from 'better-auth/types'
import * as dbClient from '../db/client'
import type { PrismaClient } from '../generated/prisma/client'
import type { ScreenshotCapturer } from '../modules/communityTools/capture'
import * as write from '../modules/communityTools/writeService'

const NOW = new Date('2026-10-21T12:00:00.000Z')

function mockUser(id: string, email: string, name: string): User {
  return {
    id,
    email,
    name,
    createdAt: NOW,
    updatedAt: NOW,
    emailVerified: false,
    image: null,
  }
}

const ann = mockUser('user-1', 'ann@example.com', 'Ann Owner')
const bob = mockUser('user-2', 'bob@example.com', 'Bob Stranger')
const actorFor = (id: string) => ({
  hash: `hash-${id}`,
  publicId: `pub-${id}`,
  alias: 'Calm Otter',
  kind: 'user' as const,
})

const dbTool = {
  id: 'tool-1',
  slug: 'my-tool',
  name: 'My Tool',
  url: 'https://my-tool.pages.example.com/',
  host: 'my-tool.pages.example.com',
  summary: 'Does a thing',
  descriptionMd: 'Longer words',
  addedByUserId: 'user-1',
  addedByName: 'Ann Owner',
  createdAt: NOW,
  updatedAt: NOW,
  reviewedAt: null,
  reviewedByName: null,
  lastCheckAt: null,
  failingSince: null,
  archivedAt: null,
  archivedReason: null,
  archivedBy: null,
  screenshotAssetId: null,
  faviconAssetId: null,
  capturedAt: null,
  siteUpdatedAt: null,
  owners: [{ toolId: 'tool-1', personSlug: 'ann@example.com' }],
  namedOwners: [] as { toolId: string; name: string }[],
  likes: [] as { userId: string; userName: string }[],
  tags: [],
}

const input = {
  url: 'https://my-tool.pages.example.com/',
  name: 'My Tool',
  summary: 'Does a thing',
  descriptionMd: 'Longer words',
  ownerSlugs: ['ann@example.com'],
  ownerNames: [] as string[],
  tags: [],
}

const noCapture = { captureHosts: [], capturer: null }

describe('Community tools write service', () => {
  let db: ReturnType<typeof makeDb>

  function makeDb() {
    return {
      dbCommunityTool: {
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(dbTool),
        update: vi.fn().mockResolvedValue(dbTool),
      },
      dbCommunityToolOwner: {
        findMany: vi.fn().mockResolvedValue(dbTool.owners),
      },
      dbCommunityToolView: { count: vi.fn().mockResolvedValue(0) },
      dbPerson: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { slug: 'ann@example.com', firstName: 'Ann', lastName: 'Owner' },
          ]),
      },
      dbFeedback: {
        create: vi.fn().mockResolvedValue({}),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      dbResource: { findMany: vi.fn().mockResolvedValue([]) },
    }
  }

  beforeEach(() => {
    db = makeDb()
    vi.spyOn(dbClient, 'getDbClient').mockReturnValue(
      db as unknown as PrismaClient,
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('caps a tag value at 32 characters', () => {
    const tagged = (value: string) =>
      write.toolInputSchema.safeParse({
        ...input,
        tags: [{ kind: 'topic', value }],
      }).success
    expect(tagged('a'.repeat(32))).toBe(true)
    expect(tagged('a'.repeat(33))).toBe(false)
  })

  it('add stores a topic normalised, and two spellings of it once', async () => {
    db.dbCommunityTool.findUnique
      .mockResolvedValueOnce(null) // the slug is free
      .mockResolvedValue(dbTool)
    const parsed = write.toolInputSchema.parse({
      ...input,
      tags: [
        { kind: 'topic', value: 'Plate Maps' },
        { kind: 'topic', value: '  plate-maps ' },
      ],
    })
    await write.addTool(
      parsed,
      { user: ann, isAdmin: false, actor: actorFor('user-1') },
      noCapture,
      NOW,
    )
    expect(db.dbCommunityTool.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tags: { create: [{ kind: 'topic', value: 'plate-maps' }] },
        }),
      }),
    )
  })

  it('add stores an owner outside the directory by name', async () => {
    db.dbCommunityTool.findUnique
      .mockResolvedValueOnce(null) // the slug is free
      .mockResolvedValue(dbTool)
    await write.addTool(
      write.toolInputSchema.parse({
        ...input,
        ownerNames: [' Kim Outside ', 'Kim Outside'],
      }),
      { user: ann, isAdmin: false, actor: actorFor('user-1') },
      noCapture,
      NOW,
    )
    expect(db.dbCommunityTool.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          owners: { create: [{ personSlug: 'ann@example.com' }] },
          namedOwners: { create: [{ name: 'Kim Outside' }] },
        }),
      }),
    )
  })

  it('add takes named owners alone, but one owner at least and five in all', async () => {
    const writer = { user: ann, isAdmin: false, actor: actorFor('user-1') }
    db.dbCommunityTool.findUnique.mockResolvedValue(dbTool)
    const add = (ownerSlugs: string[], ownerNames: string[]) =>
      write.addTool(
        { ...input, ownerSlugs, ownerNames },
        writer,
        noCapture,
        NOW,
      )
    await expect(add([], [])).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    await expect(
      add(['ann@example.com'], ['A', 'B', 'C', 'D', 'E']),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    expect(db.dbCommunityTool.create).not.toHaveBeenCalled()
    db.dbCommunityTool.findUnique.mockResolvedValueOnce(null)
    db.dbPerson.findMany.mockResolvedValueOnce([])
    await add([], ['Kim Outside'])
    expect(db.dbCommunityTool.create).toHaveBeenCalled()
  })

  it('an edit without named owners keeps them; a list replaces them', async () => {
    const named = {
      ...dbTool,
      namedOwners: [{ toolId: 'tool-1', name: 'Kim Outside' }],
    }
    db.dbCommunityTool.findUnique.mockResolvedValue(named)
    const writer = { user: ann, isAdmin: false, actor: actorFor('user-1') }
    const edited = (data: unknown) =>
      (data as { data: { namedOwners: unknown; summary: string } }).data

    await write.editTool(
      write.toolInputSchema.extend({ slug: z.string() }).parse({
        ...input,
        ownerNames: undefined,
        summary: 'New',
        slug: 'my-tool',
      }),
      writer,
      noCapture,
      NOW,
    )
    expect(edited(db.dbCommunityTool.update.mock.calls[0]?.[0])).toMatchObject({
      summary: 'New',
      namedOwners: { deleteMany: {}, create: [{ name: 'Kim Outside' }] },
    })

    await write.editTool(
      { ...input, ownerNames: [], slug: 'my-tool' },
      writer,
      noCapture,
      NOW,
    )
    expect(edited(db.dbCommunityTool.update.mock.calls[1]?.[0])).toMatchObject({
      namedOwners: { deleteMany: {}, create: [] },
    })
  })

  it('add rejects non-http url', async () => {
    await expect(
      write.addTool(
        { ...input, url: 'javascript:alert(1)' },
        { user: ann, isAdmin: false, actor: actorFor('user-1') },
        noCapture,
        NOW,
      ),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    expect(db.dbCommunityTool.create).not.toHaveBeenCalled()
  })

  it('add writes a pending review row', async () => {
    db.dbCommunityTool.findUnique
      .mockResolvedValueOnce(null) // the slug is free
      .mockResolvedValue(dbTool)

    const tool = await write.addTool(
      input,
      { user: ann, isAdmin: false, actor: actorFor('user-1') },
      noCapture,
      NOW,
    )

    expect(tool.slug).toBe('my-tool')
    expect(db.dbFeedback.create).toHaveBeenCalledWith({
      data: {
        communityToolId: 'tool-1',
        kind: 'marker',
        body: 'New tool added: My Tool',
        status: null,
        authorHash: 'hash-user-1',
        authorAlias: 'Calm Otter',
        authorUserId: 'user-1',
        authorName: 'Ann Owner',
      },
    })
  })

  it('add suffixes the slug on collision', async () => {
    db.dbCommunityTool.findUnique
      .mockResolvedValueOnce(dbTool) // my-tool taken
      .mockResolvedValueOnce(null) // my-tool-2 free
      .mockResolvedValue(dbTool)

    await write.addTool(
      input,
      { user: ann, isAdmin: false, actor: actorFor('user-1') },
      noCapture,
      NOW,
    )

    expect(db.dbCommunityTool.create.mock.calls[0]?.[0].data.slug).toBe(
      'my-tool-2',
    )
  })

  it('add rejects an owner missing from the person directory', async () => {
    await expect(
      write.addTool(
        { ...input, ownerSlugs: ['ann@example.com', 'ghost@example.com'] },
        { user: ann, isAdmin: false, actor: actorFor('user-1') },
        noCapture,
        NOW,
      ),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })

  it('edit by stranger is FORBIDDEN', async () => {
    db.dbCommunityTool.findUnique.mockResolvedValue(dbTool)

    await expect(
      write.editTool(
        { slug: 'my-tool', ...input, name: 'Hijacked' },
        { user: bob, isAdmin: false, actor: actorFor('user-2') },
        noCapture,
        NOW,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    expect(db.dbCommunityTool.update).not.toHaveBeenCalled()
  })

  it('edit by owner names the changed fields in the review row', async () => {
    db.dbCommunityTool.findUnique.mockResolvedValue(dbTool)

    await write.editTool(
      { slug: 'my-tool', ...input, summary: 'Does two things' },
      { user: ann, isAdmin: false, actor: actorFor('user-1') },
      noCapture,
      NOW,
    )

    expect(db.dbFeedback.create.mock.calls[0]?.[0].data.body).toBe(
      'Tool edited: summary',
    )
  })

  it('edit puts an approved tool back in the review queue', async () => {
    db.dbCommunityTool.findUnique.mockResolvedValue({
      ...dbTool,
      reviewedAt: NOW,
      reviewedByName: 'Ada Admin',
    })

    await write.editTool(
      { slug: 'my-tool', ...input, summary: 'Does two things' },
      { user: ann, isAdmin: false, actor: actorFor('user-1') },
      noCapture,
      NOW,
    )

    expect(db.dbCommunityTool.update.mock.calls[0]?.[0].data).toMatchObject({
      reviewedAt: null,
      reviewedByName: null,
    })
  })

  it('edit to another host starts its health over and lifts an automatic archive', async () => {
    db.dbCommunityTool.findUnique.mockResolvedValue({
      ...dbTool,
      lastCheckAt: NOW,
      failingSince: NOW,
      archivedAt: NOW,
      archivedBy: 'auto',
      archivedReason: 'Not working for 14 days',
    })
    const capture = vi.fn().mockResolvedValue({ ok: false, error: 'x' })

    await write.editTool(
      { slug: 'my-tool', ...input, url: 'https://moved.pages.example.com/' },
      { user: ann, isAdmin: false, actor: actorFor('user-1') },
      { captureHosts: ['pages.example.com'], capturer: { capture } },
      NOW,
    )

    expect(db.dbCommunityTool.update.mock.calls[0]?.[0].data).toMatchObject({
      host: 'moved.pages.example.com',
      failingSince: null,
      lastCheckAt: null,
      archivedAt: null,
      archivedBy: null,
      archivedReason: null,
    })
    await vi.waitFor(() => expect(capture).toHaveBeenCalled())
  })

  it('edit on the same host keeps the health record and a person archive', async () => {
    db.dbCommunityTool.findUnique.mockResolvedValue({
      ...dbTool,
      failingSince: NOW,
      archivedAt: NOW,
      archivedBy: 'Ann Owner',
    })

    await write.editTool(
      {
        slug: 'my-tool',
        ...input,
        url: 'https://my-tool.pages.example.com/v2',
      },
      { user: ann, isAdmin: false, actor: actorFor('user-1') },
      noCapture,
      NOW,
    )

    const data = db.dbCommunityTool.update.mock.calls[0]?.[0].data
    expect(data).not.toHaveProperty('failingSince')
    expect(data).not.toHaveProperty('archivedAt')
  })

  it('preview answers TOO_MANY_REQUESTS past three queued captures', async () => {
    const capturer = {
      capture: vi.fn(),
      waiting: () => 4,
    }

    await expect(
      write.previewTool('https://my-tool.pages.example.com/', {
        captureHosts: ['pages.example.com'],
        capturer,
      }),
    ).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' })
    expect(capturer.capture).not.toHaveBeenCalled()
  })

  it('archive sets archivedBy to the user name', async () => {
    db.dbCommunityTool.findUnique.mockResolvedValue(dbTool)

    await write.archiveTool(
      'my-tool',
      'Replaced by a better one',
      { user: ann, isAdmin: false, actor: actorFor('user-1') },
      NOW,
    )

    expect(db.dbCommunityTool.update).toHaveBeenCalledWith({
      where: { id: 'tool-1' },
      data: {
        archivedAt: NOW,
        archivedBy: 'Ann Owner',
        archivedReason: 'Replaced by a better one',
      },
    })
    expect(db.dbFeedback.updateMany).not.toHaveBeenCalled()
  })

  it('approve marks review rows applied', async () => {
    db.dbCommunityTool.findUnique.mockResolvedValue(dbTool)
    const admin = mockUser('user-9', 'admin@example.com', 'Ada Admin')

    await write.approveTool(
      'my-tool',
      { user: admin, isAdmin: true, actor: actorFor('user-9') },
      NOW,
    )

    expect(db.dbCommunityTool.update).toHaveBeenCalledWith({
      where: { id: 'tool-1' },
      data: { reviewedAt: NOW, reviewedByName: 'Ada Admin' },
    })
    expect(db.dbFeedback.updateMany).toHaveBeenCalledWith({
      where: { communityToolId: 'tool-1', status: null },
      data: { status: 'applied', reviewedAt: NOW },
    })
  })

  it('preview reports duplicate by host for a different path', async () => {
    db.dbCommunityTool.findFirst.mockResolvedValue({
      slug: 'my-tool',
      name: 'My Tool',
    })

    const preview = await write.previewTool(
      'https://my-tool.pages.example.com/other/path',
      noCapture,
    )

    expect(db.dbCommunityTool.findFirst).toHaveBeenCalledWith({
      where: { host: 'my-tool.pages.example.com' },
      select: { slug: true, name: true },
    })
    expect(preview.duplicate).toEqual({ slug: 'my-tool', name: 'My Tool' })
    expect(preview.host).toBe('my-tool.pages.example.com')
  })

  it('preview skips capture for disallowed host', async () => {
    const capturer: ScreenshotCapturer = { capture: vi.fn() }

    const preview = await write.previewTool('https://elsewhere.example.org/', {
      captureHosts: ['pages.example.com'],
      capturer,
    })

    expect(capturer.capture).not.toHaveBeenCalled()
    expect(preview).toEqual({
      host: 'elsewhere.example.org',
      title: null,
      screenshotDataUrl: null,
      duplicate: null,
      officialApp: null,
      captureAllowed: false,
    })
  })

  it('preview names the official app on the same host, any case', async () => {
    db.dbResource.findMany.mockResolvedValue([
      {
        slug: 'docs',
        displayName: 'Docs',
        appUrl: 'https://docs.example.com/',
      },
      {
        slug: 'order-service',
        displayName: 'Order Service',
        appUrl: 'https://Orders.pages.example.com/app',
      },
    ])

    const preview = await write.previewTool(
      'https://orders.pages.example.com/today',
      noCapture,
    )

    expect(db.dbResource.findMany).toHaveBeenCalledWith({
      where: { parentSlug: null, appUrl: { not: null } },
      select: { slug: true, displayName: true, appUrl: true },
    })
    expect(preview.officialApp).toEqual({
      slug: 'order-service',
      name: 'Order Service',
    })
  })

  it('preview returns a downscaled jpeg for an allowed host', async () => {
    const png = await sharp({
      create: { width: 1280, height: 800, channels: 3, background: '#fff' },
    })
      .png()
      .toBuffer()
    const capturer: ScreenshotCapturer = {
      capture: vi.fn().mockResolvedValue({
        ok: true,
        png,
        title: 'Page title',
        favicon: null,
        lastModified: null,
      }),
    }

    const preview = await write.previewTool(
      'https://my-tool.pages.example.com/',
      { captureHosts: ['pages.example.com'], capturer },
    )

    expect(capturer.capture).toHaveBeenCalledWith(
      'https://my-tool.pages.example.com/',
      ['pages.example.com'],
    )
    expect(preview.title).toBe('Page title')
    expect(preview.captureAllowed).toBe(true)
    const jpeg = Buffer.from(
      preview.screenshotDataUrl!.replace('data:image/jpeg;base64,', ''),
      'base64',
    )
    const meta = await sharp(jpeg).metadata()
    expect(meta.format).toBe('jpeg')
    expect(meta.width).toBe(640)
  })
})
