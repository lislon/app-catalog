// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as dbClient from '../db/client'
import type { PrismaClient } from '../generated/prisma/client'
import {
  addFeedback,
  dismissFeedback,
  editFeedback,
  listFeedback,
} from '../modules/feedback/service'

const NOW = new Date('2026-10-21T12:00:00.000Z')
const actor = {
  hash: 'hash-user-1',
  publicId: 'pub-user-1',
  alias: 'Calm Otter',
  kind: 'user' as const,
}

function row(fields: Record<string, unknown> = {}) {
  return {
    id: 'fb-1',
    authorHash: 'hash-user-1',
    authorAlias: 'Calm Otter',
    authorName: null,
    body: 'hi',
    subject: null,
    kind: null,
    status: null,
    reviewerReply: null,
    reviewedAt: null,
    editedAt: null,
    createdAt: NOW,
    resource: null,
    attachments: [],
    ...fields,
  }
}

describe('Feedback service', () => {
  let db: ReturnType<typeof makeDb>

  function makeDb() {
    const d = {
      $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(d)),
      dbCommunityTool: {
        findUnique: vi.fn().mockResolvedValue({ id: 'tool-1' }),
      },
      dbResource: { findUnique: vi.fn().mockResolvedValue(null) },
      dbFeedback: {
        create: vi.fn().mockResolvedValue({ id: 'fb-1' }),
        findUniqueOrThrow: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      dbFeedbackAttachment: { updateMany: vi.fn() },
    }
    return d
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

  it('comment by signed-in user stores authorName', async () => {
    db.dbFeedback.findUniqueOrThrow.mockResolvedValue(
      row({ authorName: 'Ann Owner' }),
    )

    const view = await addFeedback(
      { communityToolSlug: 'my-tool', body: 'hi' },
      actor,
      { id: 'user-1', name: 'Ann Owner' },
    )

    expect(db.dbFeedback.create.mock.calls[0]?.[0].data).toMatchObject({
      resourceId: null,
      communityToolId: 'tool-1',
      authorUserId: 'user-1',
      authorName: 'Ann Owner',
      subject: null,
    })
    expect(view.authorName).toBe('Ann Owner')
  })

  it('anonymous comment keeps the alias as its name', async () => {
    db.dbFeedback.findUniqueOrThrow.mockResolvedValue(row())

    const view = await addFeedback(
      { communityToolSlug: 'my-tool', body: 'hi' },
      { ...actor, kind: 'visitor' },
      null,
    )

    expect(db.dbFeedback.create.mock.calls[0]?.[0].data).toMatchObject({
      authorUserId: null,
      authorName: null,
    })
    expect(view.authorName).toBe('Calm Otter')
  })

  it('lists a community tool thread', async () => {
    db.dbFeedback.findMany.mockResolvedValue([row()])

    const list = await listFeedback({ communityToolSlug: 'my-tool' }, actor)

    expect(db.dbFeedback.findMany.mock.calls[0]?.[0].where).toEqual({
      communityToolId: 'tool-1',
    })
    expect(list.openCount).toBe(1)
  })

  describe("a community tool's review marker", () => {
    const marker = row({ kind: 'marker', body: 'New tool added: My Tool' })

    it('is a system line, not the publisher’s own note', async () => {
      db.dbFeedback.findMany.mockResolvedValue([marker])

      const { items } = await listFeedback(
        { communityToolSlug: 'my-tool' },
        actor,
      )

      expect(items[0]).toMatchObject({
        isSystem: true,
        isMine: false,
        canEditUntil: null,
      })
    })

    it('cannot be withdrawn by the publisher', async () => {
      db.dbFeedback.findUnique.mockResolvedValue(marker)

      await expect(dismissFeedback('fb-1', actor)).rejects.toMatchObject({
        reason: 'not-author',
      })
      expect(db.dbFeedback.delete).not.toHaveBeenCalled()
    })

    it('cannot be edited by the publisher', async () => {
      db.dbFeedback.findUnique.mockResolvedValue(marker)

      await expect(
        editFeedback('fb-1', 'rewritten', actor),
      ).rejects.toMatchObject({
        reason: 'not-author',
      })
      expect(db.dbFeedback.update).not.toHaveBeenCalled()
    })
  })
})
