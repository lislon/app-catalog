// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as dbClient from '../db/client'
import type { PrismaClient } from '../generated/prisma/client'
import type { ScreenshotCapturer } from '../modules/communityTools/capture'
import {
  runHealthCheckOnce,
  startHealthJob,
} from '../modules/communityTools/healthJob'

const NOW = new Date('2026-10-21T12:00:00.000Z')
const DAY = 24 * 60 * 60 * 1000

function tool(id: string, fields: Record<string, unknown> = {}) {
  return {
    id,
    slug: id,
    url: `https://${id}.pages.example.com/`,
    lastCheckAt: new Date(NOW.getTime() - 2 * DAY),
    failingSince: null,
    archivedAt: null,
    archivedBy: null,
    ...fields,
  }
}

describe('Community tools health job', () => {
  let db: ReturnType<typeof makeDb>
  let locked: boolean

  function makeDb() {
    const tx = {
      $queryRaw: vi.fn(() => Promise.resolve([{ locked }])),
    }
    return {
      tx,
      $transaction: vi.fn((fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
      dbCommunityTool: {
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue({}),
      },
    }
  }

  const failing: ScreenshotCapturer = {
    capture: vi.fn().mockResolvedValue({ ok: false, error: 'HTTP 503' }),
  }
  const opts = { captureHosts: ['pages.example.com'], capturer: failing }

  beforeEach(() => {
    locked = true
    db = makeDb()
    vi.spyOn(dbClient, 'getDbClient').mockReturnValue(
      db as unknown as PrismaClient,
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('health run applies nextLifecycle and skips person-archived', async () => {
    db.dbCommunityTool.findMany.mockResolvedValue([
      tool('due'),
      tool('person-archived', { archivedAt: NOW, archivedBy: 'Ann Owner' }),
      tool('fresh', { lastCheckAt: new Date(NOW.getTime() - 60 * 60 * 1000) }),
      tool('other-host', { url: 'https://elsewhere.example.org/' }),
    ])

    await runHealthCheckOnce(opts, NOW)

    expect(failing.capture).toHaveBeenCalledTimes(1)
    expect(failing.capture).toHaveBeenCalledWith(
      'https://due.pages.example.com/',
      ['pages.example.com'],
    )
    expect(db.dbCommunityTool.update).toHaveBeenCalledTimes(1)
    expect(db.dbCommunityTool.update).toHaveBeenCalledWith({
      where: { id: 'due' },
      data: { lastCheckAt: NOW, failingSince: NOW },
    })
  })

  it('health run continues with the next tool after an error', async () => {
    db.dbCommunityTool.findMany.mockResolvedValue([tool('a'), tool('b')])
    const flaky: ScreenshotCapturer = {
      capture: vi
        .fn()
        .mockRejectedValueOnce(new Error('browser crashed'))
        .mockResolvedValue({ ok: false, error: 'HTTP 503' }),
    }
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await runHealthCheckOnce({ ...opts, capturer: flaky }, NOW)

    expect(db.dbCommunityTool.update).toHaveBeenCalledTimes(1)
    expect(db.dbCommunityTool.update.mock.calls[0]?.[0].where).toEqual({
      id: 'b',
    })
  })

  it('health run stops once its time budget is spent', async () => {
    db.dbCommunityTool.findMany.mockResolvedValue([
      tool('a'),
      tool('b'),
      tool('c'),
    ])
    const MIN = 60 * 1000
    // Start, then before each tool: a fits, b starts at 41 minutes and is not checked.
    const clock = vi
      .fn()
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValue(41 * MIN)

    await runHealthCheckOnce(opts, NOW, clock)

    expect(failing.capture).toHaveBeenCalledTimes(1)
    expect(db.dbCommunityTool.update.mock.calls[0]?.[0].where).toEqual({
      id: 'a',
    })
  })

  it('first run happens a minute after start, then hourly', async () => {
    vi.useFakeTimers()
    try {
      const stop = startHealthJob(opts, () => NOW)
      await vi.advanceTimersByTimeAsync(59_000)
      expect(db.$transaction).not.toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(1_000)
      expect(db.$transaction).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
      expect(db.$transaction).toHaveBeenCalledTimes(2)
      stop()
      await vi.advanceTimersByTimeAsync(2 * 60 * 60 * 1000)
      expect(db.$transaction).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('health run does nothing when the advisory lock is held', async () => {
    locked = false
    db.dbCommunityTool.findMany.mockResolvedValue([tool('due')])

    await runHealthCheckOnce(opts, NOW)

    expect(db.tx.$queryRaw).toHaveBeenCalledTimes(1)
    expect(db.dbCommunityTool.findMany).not.toHaveBeenCalled()
    expect(failing.capture).not.toHaveBeenCalled()
  })
})
