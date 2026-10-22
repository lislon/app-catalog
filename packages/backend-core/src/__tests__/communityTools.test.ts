// @vitest-environment node
import sharp from 'sharp'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as dbClient from '../db/client'
import type { PrismaClient } from '../generated/prisma/client'
import { checkTool } from '../modules/communityTools/healthJob'
import type { CaptureDeps } from '../modules/communityTools/healthJob'
import * as service from '../modules/communityTools/service'
import { toView } from '../modules/communityTools/toView'
import type { User } from 'better-auth/types'

/** A deployment that captures nothing: the OSS default. */
const NO_CAPTURE: CaptureDeps = { captureHosts: [], capturer: null }

const mockUser = (partial: {
  id: string
  email: string
  name: string
}): User => ({
  ...partial,
  createdAt: new Date(),
  updatedAt: new Date(),
  emailVerified: false,
  image: null,
})

describe('Community tools service', () => {
  const mockDb = {
    dbCommunityTool: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    dbCommunityToolOpen: {
      create: vi.fn(),
      count: vi.fn(),
    },
    dbCommunityToolPin: {
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    dbCommunityToolOwner: {
      findMany: vi.fn(),
    },
    dbCommunityToolNamedOwner: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    dbCommunityToolTag: {
      findMany: vi.fn(),
    },
    dbPerson: {
      findMany: vi.fn(),
    },
  } as unknown as PrismaClient

  beforeEach(() => {
    vi.spyOn(dbClient, 'getDbClient').mockReturnValue(mockDb)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('countByApp', () => {
    it('counts live tools per app tag', async () => {
      const groupBy = vi.fn().mockResolvedValue([
        { value: 'order-service', _count: { _all: 2 } },
        { value: 'docs', _count: { _all: 1 } },
      ])
      vi.spyOn(dbClient, 'getDbClient').mockReturnValue({
        dbCommunityToolTag: { groupBy },
      } as unknown as PrismaClient)

      expect(await service.countByApp()).toEqual({
        'order-service': 2,
        docs: 1,
      })
      expect(groupBy).toHaveBeenCalledWith({
        by: ['value'],
        where: { kind: 'app', tool: { archivedAt: null } },
        _count: { _all: true },
      })
    })
  })

  describe('recordOpen', () => {
    const actor = {
      hash: 'test-hash',
      publicId: 'test-public',
      alias: 'Test User',
      kind: 'visitor' as const,
    }

    /** The open table in memory: what was written is what is counted. */
    function opensTable() {
      const rows: { toolId: string; actorHash: string; at: Date }[] = []
      type Where = {
        toolId: string
        actorHash?: string
        at?: { gte?: Date; gt?: Date }
      }
      const matches = (r: (typeof rows)[number], w: Where) =>
        r.toolId === w.toolId &&
        (w.actorHash === undefined || r.actorHash === w.actorHash) &&
        (!w.at?.gte || r.at >= w.at.gte) &&
        (!w.at?.gt || r.at > w.at.gt)
      mockDb.dbCommunityToolOpen.create = vi.fn(
        ({ data }: { data: (typeof rows)[number] }) => {
          rows.push(data)
          return Promise.resolve(data)
        },
      ) as never
      mockDb.dbCommunityToolOpen.count = vi.fn(({ where }: { where: Where }) =>
        Promise.resolve(rows.filter((r) => matches(r, where)).length),
      ) as never
      return rows
    }

    beforeEach(() => {
      mockDb.dbCommunityTool.findUnique = vi
        .fn()
        .mockResolvedValue({ id: 'tool-1' })
    })

    it('counts every open, two on the same day as two', async () => {
      const rows = opensTable()
      const at = new Date('2024-01-15T10:00:00Z')

      await service.recordOpen('test-slug', 'card', actor, null, at)
      const second = await service.recordOpen(
        'test-slug',
        'site',
        actor,
        null,
        new Date(at.getTime() + 5 * 60_000),
      )

      expect(second).toEqual({ views30d: 2, viewsAll: 2 })
      expect(rows.map((r) => (r as unknown as { kind: string }).kind)).toEqual([
        'card',
        'site',
      ])
    })

    it('counts the last 30 days in views30d, every open in viewsAll', async () => {
      const rows = opensTable()
      rows.push({
        toolId: 'tool-1',
        actorHash: 'someone',
        at: new Date('2023-12-01T00:00:00Z'),
      })

      const counts = await service.recordOpen(
        'test-slug',
        'card',
        actor,
        null,
        new Date('2024-01-15T10:00:00Z'),
      )

      expect(counts).toEqual({ views30d: 1, viewsAll: 2 })
    })

    it('ignores a visitor opening one tool more than 30 times a minute', async () => {
      opensTable()
      const at = new Date('2024-01-15T10:00:00Z')
      let counts = { views30d: 0, viewsAll: 0 }
      for (let i = 0; i < 35; i++) {
        counts = await service.recordOpen(
          'test-slug',
          'site',
          actor,
          null,
          new Date(at.getTime() + i * 1000),
        )
      }

      expect(counts.viewsAll).toBe(30)
    })
  })

  describe('pins', () => {
    it('returns pins in position order', async () => {
      const userId = 'user-123'

      // Mock returns data in position order (as if orderBy: { position: 'asc' } was applied)
      mockDb.dbCommunityToolPin.findMany = vi.fn().mockResolvedValue([
        {
          position: 0,
          tool: {
            id: 'tool-a',
            slug: 'tool-a',
            name: 'Tool A',
            url: 'https://a.example.com',
            host: 'a.example.com',
            summary: 'Summary A',
            descriptionMd: 'Description A',
            addedByUserId: 'user-1',
            addedByName: 'User One',
            createdAt: new Date('2024-01-01'),
            reviewedAt: new Date(),
            reviewedByName: null,
            screenshotAssetId: null,
            faviconAssetId: null,
            capturedAt: null,
            siteUpdatedAt: null,
            failingSince: null,
            archivedAt: null,
            archivedBy: null,
            unreachableSince: null,
            archivedReason: null,
            owners: [],
            namedOwners: [],
            likes: [] as { userId: string; userName: string }[],
            _count: { feedback: 0 },
            tags: [],
          },
        },
        {
          position: 1,
          tool: {
            id: 'tool-c',
            slug: 'tool-c',
            name: 'Tool C',
            url: 'https://c.example.com',
            host: 'c.example.com',
            summary: 'Summary C',
            descriptionMd: 'Description C',
            addedByUserId: 'user-1',
            addedByName: 'User One',
            createdAt: new Date('2024-01-01'),
            reviewedAt: new Date(),
            reviewedByName: null,
            screenshotAssetId: null,
            faviconAssetId: null,
            capturedAt: null,
            siteUpdatedAt: null,
            failingSince: null,
            archivedAt: null,
            archivedBy: null,
            unreachableSince: null,
            archivedReason: null,
            owners: [],
            namedOwners: [],
            likes: [] as { userId: string; userName: string }[],
            _count: { feedback: 0 },
            tags: [],
          },
        },
        {
          position: 2,
          tool: {
            id: 'tool-b',
            slug: 'tool-b',
            name: 'Tool B',
            url: 'https://b.example.com',
            host: 'b.example.com',
            summary: 'Summary B',
            descriptionMd: 'Description B',
            addedByUserId: 'user-1',
            addedByName: 'User One',
            createdAt: new Date('2024-01-01'),
            reviewedAt: new Date(),
            reviewedByName: null,
            screenshotAssetId: null,
            faviconAssetId: null,
            capturedAt: null,
            siteUpdatedAt: null,
            failingSince: null,
            archivedAt: null,
            archivedBy: null,
            unreachableSince: null,
            archivedReason: null,
            owners: [],
            namedOwners: [],
            likes: [] as { userId: string; userName: string }[],
            _count: { feedback: 0 },
            tags: [],
          },
        },
      ])

      mockDb.dbPerson.findMany = vi.fn().mockResolvedValue([])
      mockDb.dbCommunityToolOpen.count = vi.fn().mockResolvedValue(0)

      const now = new Date('2024-01-15T12:00:00Z')
      const result = await service.listPins(
        userId,
        null,
        false,
        now,
        NO_CAPTURE,
      )

      // Should be sorted by position ascending
      expect(result.map((t) => t.slug)).toEqual(['tool-a', 'tool-c', 'tool-b'])
    })

    it('reorderPins with partial list keeps unlisted pins', async () => {
      const userId = 'user-123'

      mockDb.dbCommunityToolPin.findMany = vi.fn().mockResolvedValue([
        {
          userId,
          toolId: 'tool-a',
          position: 0,
          tool: { id: 'tool-a', slug: 'tool-a' },
        },
        {
          userId,
          toolId: 'tool-b',
          position: 1,
          tool: { id: 'tool-b', slug: 'tool-b' },
        },
        {
          userId,
          toolId: 'tool-c',
          position: 2,
          tool: { id: 'tool-c', slug: 'tool-c' },
        },
      ])

      mockDb.dbCommunityToolPin.update = vi.fn().mockResolvedValue({})

      // Reorder only tool-c and tool-a (omit tool-b)
      await service.reorderPins(['tool-c', 'tool-a'], userId)

      // Should call update 3 times (all pins get new positions)
      expect(mockDb.dbCommunityToolPin.update).toHaveBeenCalledTimes(3)

      // tool-c at position 0, tool-a at position 1, tool-b at position 2
      const calls = vi.mocked(mockDb.dbCommunityToolPin.update).mock.calls
      expect(calls[0]?.[0]).toMatchObject({
        where: { userId_toolId: { userId, toolId: 'tool-c' } },
        data: { position: 0 },
      })
      expect(calls[1]?.[0]).toMatchObject({
        where: { userId_toolId: { userId, toolId: 'tool-a' } },
        data: { position: 1 },
      })
      expect(calls[2]?.[0]).toMatchObject({
        where: { userId_toolId: { userId, toolId: 'tool-b' } },
        data: { position: 2 },
      })
    })
  })

  describe('canEdit', () => {
    it('returns true for owner email', async () => {
      const user = mockUser({
        id: 'user-1',
        email: 'owner@example.com',
        name: 'Owner',
      })
      const tool = {
        id: 'tool-1',
        slug: 'test',
        addedByUserId: 'other-user',
      }

      vi.spyOn(mockDb.dbCommunityToolOwner, 'findMany').mockResolvedValue([
        { toolId: 'tool-1', personSlug: 'owner@example.com' },
      ])

      const canEdit = await service.computeCanEdit(tool, user, false)
      expect(canEdit).toBe(true)
    })

    it('returns true for adder', async () => {
      const user = mockUser({
        id: 'user-1',
        email: 'user@example.com',
        name: 'User',
      })
      const tool = {
        id: 'tool-1',
        slug: 'test',
        addedByUserId: 'user-1',
      }

      vi.spyOn(mockDb.dbCommunityToolOwner, 'findMany').mockResolvedValue([])

      const canEdit = await service.computeCanEdit(tool, user, false)
      expect(canEdit).toBe(true)
    })

    it('returns false for stranger', async () => {
      const user = mockUser({
        id: 'user-1',
        email: 'stranger@example.com',
        name: 'Stranger',
      })
      const tool = {
        id: 'tool-1',
        slug: 'test',
        addedByUserId: 'other-user',
      }

      vi.spyOn(mockDb.dbCommunityToolOwner, 'findMany').mockResolvedValue([
        { toolId: 'tool-1', personSlug: 'owner@example.com' },
      ])

      const canEdit = await service.computeCanEdit(tool, user, false)
      expect(canEdit).toBe(false)
    })

    it('returns true for admin', async () => {
      const user = mockUser({
        id: 'user-1',
        email: 'stranger@example.com',
        name: 'Stranger',
      })
      const tool = {
        id: 'tool-1',
        slug: 'test',
        addedByUserId: 'other-user',
      }

      vi.spyOn(mockDb.dbCommunityToolOwner, 'findMany').mockResolvedValue([])

      const canEdit = await service.computeCanEdit(tool, user, true)
      expect(canEdit).toBe(true)
    })
  })

  describe('list', () => {
    it('maps lifecycle via lifecycleOf', async () => {
      const now = new Date('2024-01-15T12:00:00Z')

      mockDb.dbCommunityTool.findMany = vi.fn().mockResolvedValue([
        {
          id: 'tool-1',
          slug: 'active-tool',
          name: 'Active Tool',
          url: 'https://active.example.com',
          host: 'active.example.com',
          summary: 'Summary',
          descriptionMd: 'Description',
          addedByUserId: 'user-1',
          addedByName: 'User One',
          createdAt: new Date('2024-01-01'),
          reviewed: true,
          screenshotId: null,
          faviconId: null,
          capturedAt: null,
          siteUpdatedAt: null,
          failingSince: null,
          archivedAt: null,
          archivedBy: null,
          unreachableSince: null,
          archivedReason: null,
          owners: [],
          namedOwners: [],
          likes: [] as { userId: string; userName: string }[],
          _count: { feedback: 0 },
          tags: [],
        },
        {
          id: 'tool-2',
          slug: 'failing-tool',
          name: 'Failing Tool',
          url: 'https://failing.example.com',
          host: 'failing.example.com',
          summary: 'Summary',
          descriptionMd: 'Description',
          addedByUserId: 'user-1',
          addedByName: 'User One',
          createdAt: new Date('2024-01-01'),
          reviewed: true,
          screenshotId: null,
          faviconId: null,
          capturedAt: null,
          siteUpdatedAt: null,
          failingSince: new Date('2024-01-10T00:00:00Z'),
          archivedAt: null,
          archivedBy: null,
          unreachableSince: null,
          archivedReason: null,
          owners: [],
          namedOwners: [],
          likes: [] as { userId: string; userName: string }[],
          _count: { feedback: 0 },
          tags: [],
        },
      ])

      mockDb.dbPerson.findMany = vi.fn().mockResolvedValue([])
      mockDb.dbCommunityToolOpen.count = vi.fn().mockResolvedValue(0)

      const result = await service.listTools(null, false, now, NO_CAPTURE)

      // Active tool should have state: 'active'
      expect(result[0]?.lifecycle).toEqual({ state: 'active' })

      // Failing tool should have state: 'not-working' with days calculated
      // Whole days of the streak: 5.5 days is 5
      expect(result[1]?.lifecycle.state).toBe('not-working')
      expect((result[1]?.lifecycle as any).days).toBe(5)
    })
  })

  describe('capturePending', () => {
    const capturer = { capture: vi.fn() }
    const CAPTURES: CaptureDeps = {
      captureHosts: ['example.com'],
      capturer,
    }
    const row = (over: Record<string, unknown> = {}) =>
      ({
        id: 'tool-1',
        slug: 'new-tool',
        name: 'New Tool',
        url: 'https://new-tool.pages.example.com/',
        host: 'new-tool.pages.example.com',
        summary: '',
        descriptionMd: '',
        addedByUserId: 'user-1',
        addedByName: 'User One',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        reviewedAt: null,
        reviewedByName: null,
        lastCheckAt: null,
        failingSince: null,
        archivedAt: null,
        archivedReason: null,
        archivedBy: null,
        unreachableSince: null,
        screenshotAssetId: null,
        faviconAssetId: null,
        capturedAt: null,
        siteUpdatedAt: null,
        owners: [],
        namedOwners: [],
        likes: [] as { userId: string; userName: string }[],
        _count: { feedback: 0 },
        tags: [],
        ...over,
      }) as Parameters<typeof toView>[0]
    const pending = async (
      over: Record<string, unknown>,
      capture: CaptureDeps = CAPTURES,
    ) =>
      (
        await toView(
          row(over),
          new Map(),
          { views30d: 0, viewsAll: 0 },
          null,
          false,
          new Date('2024-01-15T12:00:00Z'),
          capture,
        )
      ).capturePending

    it('counts likes, says whether I liked it, and names 8 others, newest first', async () => {
      const likes = Array.from({ length: 10 }, (_, i) => ({
        userId: `user-${i}`,
        userName: `Person ${i}`,
      }))
      const view = await toView(
        row({ likes }),
        new Map(),
        { views30d: 0, viewsAll: 0 },
        mockUser({ id: 'user-3', email: 'p3@example.com', name: 'Person 3' }),
        false,
        new Date('2024-01-15T12:00:00Z'),
        CAPTURES,
      )
      expect(view.likes).toBe(10)
      expect(view.likedByMe).toBe(true)
      // My own like is likedByMe, never one of the names.
      expect(view.likedBy).toEqual(
        likes
          .filter((l) => l.userId !== 'user-3')
          .slice(0, 8)
          .map((l) => l.userName),
      )
      const anonymous = await toView(
        row({ likes }),
        new Map(),
        { views30d: 0, viewsAll: 0 },
        null,
        false,
        new Date('2024-01-15T12:00:00Z'),
        CAPTURES,
      )
      expect(anonymous.likedByMe).toBe(false)
    })

    it('counts the comments the query counted', async () => {
      const view = await toView(
        row({ _count: { feedback: 3 } }),
        new Map(),
        { views30d: 0, viewsAll: 0 },
        null,
        false,
        new Date('2024-01-15T12:00:00Z'),
        CAPTURES,
      )
      expect(view.comments).toBe(3)
    })

    it('lists an owner outside the directory by name, with no slug', async () => {
      const view = await toView(
        row({
          owners: [{ toolId: 'tool-1', personSlug: 'dana@example.com' }],
          namedOwners: [{ toolId: 'tool-1', name: 'Kim Outside' }],
        }),
        new Map(),
        { views30d: 0, viewsAll: 0 },
        null,
        false,
        new Date('2024-01-15T12:00:00Z'),
        CAPTURES,
      )
      expect(view.owners).toEqual([
        { slug: 'dana@example.com', name: 'dana@example.com' },
        { slug: null, name: 'Kim Outside' },
      ])
    })

    it('is pending for a new tool on an allowed host with a capturer', async () => {
      expect(await pending({})).toBe(true)
    })

    it('is not pending once there is a screenshot', async () => {
      expect(await pending({ screenshotAssetId: 'shot-1' })).toBe(false)
    })

    it('is not pending once the first visit ran, even if it failed', async () => {
      expect(await pending({ lastCheckAt: new Date('2024-01-15') })).toBe(false)
    })

    it('is not pending after a capture that threw', async () => {
      const db = {
        dbCommunityTool: { update: vi.fn().mockResolvedValue({}) },
      }
      vi.spyOn(dbClient, 'getDbClient').mockReturnValue(
        db as unknown as PrismaClient,
      )
      const now = new Date('2024-01-15T12:00:00Z')
      const launchFails = {
        capture: vi.fn().mockRejectedValue(new Error('launch failed')),
      }
      await expect(
        checkTool(
          {
            id: 'tool-1',
            slug: 'new-tool',
            url: 'https://new-tool.pages.example.com/',
            failingSince: null,
            archivedAt: null,
            archivedBy: null,
            unreachableSince: null,
          },
          { ...CAPTURES, capturer: launchFails },
          now,
        ),
      ).rejects.toThrow('launch failed')
      // Whatever the throw wrote is what the next read sees.
      const written = db.dbCommunityTool.update.mock.calls[0]?.[0].data
      expect(written).toEqual({ lastCheckAt: now })
      expect(await pending(written)).toBe(false)
    })

    describe('when the site last changed', () => {
      const visit = async (lastModified: Date | null) => {
        const db = {
          dbCommunityTool: { update: vi.fn().mockResolvedValue({}) },
          dbAsset: {
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({ id: 'asset-1' }),
          },
        }
        vi.spyOn(dbClient, 'getDbClient').mockReturnValue(
          db as unknown as PrismaClient,
        )
        const png = await sharp({
          create: { width: 4, height: 4, channels: 3, background: '#fff' },
        })
          .png()
          .toBuffer()
        const capture = vi.fn().mockResolvedValue({
          ok: true,
          png,
          title: null,
          favicon: null,
          lastModified,
        })
        await checkTool(
          {
            id: 'tool-1',
            slug: 'new-tool',
            url: 'https://new-tool.pages.example.com/',
            failingSince: null,
            archivedAt: null,
            archivedBy: null,
            unreachableSince: null,
          },
          { ...CAPTURES, capturer: { capture } },
          new Date('2024-01-15T12:00:00Z'),
        )
        return db.dbCommunityTool.update.mock.calls[0]?.[0].data as Record<
          string,
          unknown
        >
      }

      it('is stored from the page Last-Modified', async () => {
        const changed = new Date('2024-01-10T08:00:00Z')
        expect((await visit(changed))['siteUpdatedAt']).toEqual(changed)
      })

      it('is left as it was when the page sends none', async () => {
        expect(await visit(null)).not.toHaveProperty('siteUpdatedAt')
      })
    })

    it('is not pending without a capturer', async () => {
      expect(await pending({}, { ...CAPTURES, capturer: null })).toBe(false)
    })

    it('is not pending for a host outside the capture suffixes', async () => {
      expect(
        await pending({
          url: 'https://tool.other.test/',
          host: 'tool.other.test',
        }),
      ).toBe(false)
    })
  })
})

describe('pin and unpin', () => {
  const db = {
    dbCommunityTool: { findUnique: vi.fn() },
    dbCommunityToolPin: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  }

  beforeEach(() => {
    vi.spyOn(dbClient, 'getDbClient').mockReturnValue(
      db as unknown as PrismaClient,
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('answers NOT_FOUND for an unknown slug', async () => {
    db.dbCommunityTool.findUnique.mockResolvedValue(null)

    await expect(service.pinTool('nope', 'user-1')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
    await expect(service.unpinTool('nope', 'user-1')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })

  it('leaves a pinned tool where it is when pinned again', async () => {
    db.dbCommunityTool.findUnique.mockResolvedValue({ id: 'tool-a' })
    db.dbCommunityToolPin.findFirst.mockResolvedValue({ position: 4 })

    await service.pinTool('tool-a', 'user-1')

    expect(db.dbCommunityToolPin.upsert).toHaveBeenCalledWith({
      where: { userId_toolId: { userId: 'user-1', toolId: 'tool-a' } },
      create: { userId: 'user-1', toolId: 'tool-a', position: 5 },
      update: {},
    })
  })
})

describe('like and unlike', () => {
  const db = {
    dbCommunityTool: { findUnique: vi.fn() },
    dbCommunityToolLike: { upsert: vi.fn(), deleteMany: vi.fn() },
  }
  const ann = { id: 'user-1', name: 'Ann Owner' }

  beforeEach(() => {
    vi.spyOn(dbClient, 'getDbClient').mockReturnValue(
      db as unknown as PrismaClient,
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('likes once however often it is asked, keeping the name for Liked by', async () => {
    db.dbCommunityTool.findUnique.mockResolvedValue({ id: 'tool-a' })

    await service.likeTool('tool-a', ann)
    await service.likeTool('tool-a', ann)

    expect(db.dbCommunityToolLike.upsert).toHaveBeenCalledTimes(2)
    expect(db.dbCommunityToolLike.upsert).toHaveBeenLastCalledWith({
      where: { toolId_userId: { toolId: 'tool-a', userId: 'user-1' } },
      create: { toolId: 'tool-a', userId: 'user-1', userName: 'Ann Owner' },
      update: {},
    })
  })

  it('counts a like that lost a race with the same like as liked', async () => {
    db.dbCommunityTool.findUnique.mockResolvedValue({ id: 'tool-a' })
    db.dbCommunityToolLike.upsert.mockRejectedValueOnce(
      Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }),
    )
    await expect(service.likeTool('tool-a', ann)).resolves.toBeUndefined()

    db.dbCommunityToolLike.upsert.mockRejectedValueOnce(new Error('db down'))
    await expect(service.likeTool('tool-a', ann)).rejects.toThrow('db down')
  })

  it('unlikes only my own like, and an unliked tool stays unliked', async () => {
    db.dbCommunityTool.findUnique.mockResolvedValue({ id: 'tool-a' })

    await service.unlikeTool('tool-a', 'user-1')

    expect(db.dbCommunityToolLike.deleteMany).toHaveBeenCalledWith({
      where: { toolId: 'tool-a', userId: 'user-1' },
    })
  })

  it('answers NOT_FOUND for an unknown slug', async () => {
    db.dbCommunityTool.findUnique.mockResolvedValue(null)

    await expect(service.likeTool('nope', ann)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
    await expect(service.unlikeTool('nope', 'user-1')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })
})
