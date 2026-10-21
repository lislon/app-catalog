// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as dbClient from '../db/client'
import type { PrismaClient } from '../generated/prisma/client'
import * as service from '../modules/communityTools/service'
import type { User } from 'better-auth/types'

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
    dbCommunityToolView: {
      upsert: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
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

  describe('recordView', () => {
    it('counts view twice same day once', async () => {
      const actor = {
        hash: 'test-hash',
        publicId: 'test-public',
        alias: 'Test User',
        kind: 'visitor' as const,
      }

      mockDb.dbCommunityTool.findUnique = vi
        .fn()
        .mockResolvedValue({ id: 'tool-1' })
      mockDb.dbCommunityToolView.upsert = vi.fn().mockResolvedValue({})

      // Mock count to return different values for each call
      let countCallIndex = 0
      mockDb.dbCommunityToolView.count = vi.fn().mockImplementation(() => {
        const results = [1, 5, 1, 5] // views30d, viewsAll for each recordView call
        return Promise.resolve(results[countCallIndex++])
      })

      // First view
      const result1 = await service.recordView(
        'test-slug',
        actor,
        null,
        new Date('2024-01-15'),
      )

      // Second view same day
      const result2 = await service.recordView(
        'test-slug',
        actor,
        null,
        new Date('2024-01-15'),
      )

      // Both calls should upsert the same row (same day)
      expect(mockDb.dbCommunityToolView.upsert).toHaveBeenCalledTimes(2)
      const calls = vi.mocked(mockDb.dbCommunityToolView.upsert).mock.calls
      const call1 = calls[0]?.[0]
      const call2 = calls[1]?.[0]

      // Same composite key (toolId, actorHash, day)
      expect(call1?.where).toEqual({
        toolId_actorHash_day: {
          toolId: 'tool-1',
          actorHash: 'test-hash',
          day: new Date('2024-01-15T00:00:00.000Z'),
        },
      })
      expect(call2?.where).toEqual(call1?.where)

      expect(result1).toEqual({ views30d: 1, viewsAll: 5 })
      expect(result2).toEqual({ views30d: 1, viewsAll: 5 })
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
            failingSince: null,
            archivedAt: null,
            archivedBy: null,
            archivedReason: null,
            owners: [],
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
            failingSince: null,
            archivedAt: null,
            archivedBy: null,
            archivedReason: null,
            owners: [],
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
            failingSince: null,
            archivedAt: null,
            archivedBy: null,
            archivedReason: null,
            owners: [],
            tags: [],
          },
        },
      ])

      mockDb.dbPerson.findMany = vi.fn().mockResolvedValue([])
      mockDb.dbCommunityToolView.count = vi.fn().mockResolvedValue(0)

      const now = new Date('2024-01-15T12:00:00Z')
      const result = await service.listPins(userId, null, false, now)

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
          failingSince: null,
          archivedAt: null,
          archivedBy: null,
          archivedReason: null,
          owners: [],
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
          failingSince: new Date('2024-01-10T00:00:00Z'),
          archivedAt: null,
          archivedBy: null,
          archivedReason: null,
          owners: [],
          tags: [],
        },
      ])

      mockDb.dbPerson.findMany = vi.fn().mockResolvedValue([])
      mockDb.dbCommunityToolView.count = vi.fn().mockResolvedValue(0)

      const result = await service.listTools(null, false, now)

      // Active tool should have state: 'active'
      expect(result[0]?.lifecycle).toEqual({ state: 'active' })

      // Failing tool should have state: 'not-working' with days calculated
      // lifecycleOf uses Math.ceil, so 5.5 days becomes 6
      expect(result[1]?.lifecycle.state).toBe('not-working')
      expect((result[1]?.lifecycle as any).days).toBe(6)
    })
  })
})
