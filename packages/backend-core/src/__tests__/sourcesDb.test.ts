// @vitest-environment node
/**
 * DB-backed integration tests for sources module.
 * Requires AC_TEST_DATABASE_URL pointing to a Postgres instance (not a specific database).
 * Creates and drops a throwaway schema per test run.
 */
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { PrismaClient } from '../generated/prisma/client'
import { syncAppCatalog } from '../db/syncAppCatalog'
import {
  getResourcesFromPrisma,
  updateApp,
} from '../modules/appCatalog/service'
import type { Resource } from '../types/common/appCatalogTypes'
import { TEST_DB_URL, useTestDatabase } from './utils/testDatabase'

describe.skipIf(!TEST_DB_URL)('sourcesDb integration', () => {
  const db = useTestDatabase('test_sources')
  let prisma: PrismaClient
  let testResourceIds: string[] = []

  beforeAll(() => {
    prisma = db.prisma
  })

  beforeEach(() => {
    testResourceIds = []
  })

  afterEach(async () => {
    if (testResourceIds.length > 0) {
      await prisma.dbResource.deleteMany({
        where: { id: { in: testResourceIds } },
      })
    }
    await prisma.sourceUrl.deleteMany({
      where: { url: { startsWith: 'https://test-sources-' } },
    })
    await prisma.source.deleteMany({
      where: { slug: { startsWith: 'test-sources-' } },
    })
  })

  it('two apps citing one URL share one SourceUrl row, and other apps survive updateApp', async () => {
    const sharedUrl = 'https://test-sources-shared.example.com/guide'
    const url1 = 'https://test-sources-app1.example.com/readme'
    const url2 = 'https://test-sources-app2.example.com/readme'

    const app1: Resource = {
      id: 'test-sources-app1',
      slug: 'test-sources-app1',
      displayName: 'Test Sources App 1',
      description: 'First test app',
      sources: [sharedUrl, url1],
    }
    const app2: Resource = {
      id: 'test-sources-app2',
      slug: 'test-sources-app2',
      displayName: 'Test Sources App 2',
      description: 'Second test app',
      sources: [sharedUrl, url2],
    }

    await syncAppCatalog([app1, app2], [], [])

    const synced = await prisma.dbResource.findMany({
      where: { slug: { in: ['test-sources-app1', 'test-sources-app2'] } },
      orderBy: { slug: 'asc' },
    })
    testResourceIds = synced.map((r) => r.id)

    const sharedCount = await prisma.sourceUrl.count({
      where: { url: sharedUrl },
    })
    expect(sharedCount).toBe(1)

    const resources = await getResourcesFromPrisma()
    const res1 = resources.find((r) => r.slug === 'test-sources-app1')
    const res2 = resources.find((r) => r.slug === 'test-sources-app2')

    const res1Urls = res1?.sources?.map((s) =>
      typeof s === 'string' ? s : s.url,
    )
    const res2Urls = res2?.sources?.map((s) =>
      typeof s === 'string' ? s : s.url,
    )

    expect(res1Urls).toContain(sharedUrl)
    expect(res1Urls).toContain(url1)
    expect(res2Urls).toContain(sharedUrl)
    expect(res2Urls).toContain(url2)

    await updateApp({
      id: synced[0]!.id,
      data: { sources: [sharedUrl] },
    })

    const app1Links = await prisma.dbResourceSourceUrl.findMany({
      where: { resourceId: synced[0]!.id },
    })
    expect(app1Links).toHaveLength(1)
    expect(app1Links[0]!.url).toBe(sharedUrl)

    const app2Links = await prisma.dbResourceSourceUrl.findMany({
      where: { resourceId: synced[1]!.id },
    })
    expect(app2Links).toHaveLength(2)
    expect(app2Links.map((l) => l.url).sort()).toEqual([sharedUrl, url2].sort())
  })

  it('schedule from an enriched source survives sync and produces correct pulse', async () => {
    // Pin clock to make pulse deterministic
    const now = new Date('2026-11-15T00:00:00Z')
    vi.useFakeTimers()
    vi.setSystemTime(now)

    const url = 'https://test-sources-scheduled.example.com/api'
    const nextCheckAfter = new Date('2026-12-01T00:00:00Z')
    const lastCheckedAt = new Date('2026-11-01T00:00:00Z')
    const lastContentChangeAt = new Date('2026-10-15T00:00:00Z')

    const app: Resource = {
      id: 'test-sources-scheduled',
      slug: 'test-sources-scheduled',
      displayName: 'Test Sources Scheduled',
      description: 'Test app with schedule',
      sources: [
        {
          url,
          schedule: {
            nextCheckAfter: nextCheckAfter.toISOString(),
            lastCheckedAt: lastCheckedAt.toISOString(),
            lastContentChangeAt: lastContentChangeAt.toISOString(),
            checkIntervalHours: 24,
            changeHistory: [{ date: '2026-10-15T00:00:00Z', changed: true }],
          },
        },
      ],
    }

    await syncAppCatalog([app], [], [])

    const synced = await prisma.dbResource.findUnique({
      where: { slug: 'test-sources-scheduled' },
    })
    testResourceIds = synced ? [synced.id] : []

    const sourceUrl = await prisma.sourceUrl.findUnique({
      where: { url },
    })

    expect(sourceUrl).toBeTruthy()
    expect(sourceUrl?.nextCheckAfter?.toISOString()).toBe(
      nextCheckAfter.toISOString(),
    )
    expect(sourceUrl?.lastCheckedAt?.toISOString()).toBe(
      lastCheckedAt.toISOString(),
    )
    expect(sourceUrl?.lastContentChangeAt?.toISOString()).toBe(
      lastContentChangeAt.toISOString(),
    )
    expect(sourceUrl?.checkIntervalHours).toBe(24)

    const resources = await getResourcesFromPrisma()
    const res = resources.find((r) => r.slug === 'test-sources-scheduled')
    const source = res?.sources?.[0]

    if (typeof source === 'string') {
      throw new Error('Expected SourceReference, got string')
    }

    // Compare full pulse with pinned clock
    expect(source?.pulse).toEqual({
      cadence: 'daily',
      state: 'ok',
      intervalHours: 24,
      dueAt: '2026-12-01T00:00:00.000Z',
      lastCheckedAt: '2026-11-01T00:00:00.000Z',
      lastContentChangeAt: '2026-10-15T00:00:00.000Z',
      contentChangeIsLowerBound: false,
      checks: [{ date: '2026-10-15T00:00:00Z', changed: true }],
    })

    // Assert no test data leaked into public schema. A fresh CI database has
    // no public."DbResource" at all, which is not a leak either.
    const [publicTable] = await prisma.$queryRaw<
      { exists: boolean }[]
    >`SELECT to_regclass('public."DbResource"') IS NOT NULL AS exists`
    const publicCount = publicTable?.exists
      ? await prisma.$queryRaw<
          { count: bigint }[]
        >`SELECT COUNT(*) as count FROM public."DbResource" WHERE slug LIKE 'test-sources-%'`
      : [{ count: 0n }]
    expect(Number(publicCount[0]?.count)).toBe(0)

    vi.useRealTimers()
  })

  it('catalogAddedAt backfill updates the configured schema, never public', async () => {
    const slug = 'test-sources-schema-isolation'
    const publicCreatedAt = new Date('2030-01-01T00:00:00Z')
    const catalogAddedAt = new Date('2020-01-01T00:00:00Z')
    // A fresh CI database has an empty public; give it a decoy table so a
    // raw query that falls through to public would hit a matching row.
    const [existing] = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT to_regclass('public."DbResource"') IS NOT NULL AS exists`
    if (!existing?.exists) {
      await prisma.$executeRawUnsafe(
        `CREATE TABLE public."DbResource" (LIKE "${db.schema}"."DbResource" INCLUDING ALL)`,
      )
    }
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO public."DbResource" ("id", "slug", "displayName", "description", "createdAt", "updatedAt")
         VALUES ($1, $2, 'Decoy', 'Decoy', $3, $3)`,
        'test-sources-schema-isolation-decoy',
        slug,
        publicCreatedAt,
      )
      await syncAppCatalog(
        [
          {
            id: slug,
            slug,
            displayName: 'Schema Isolation',
            description: 'raw SQL must target the configured schema',
            catalogAddedAt: catalogAddedAt.toISOString(),
          },
        ],
        [],
        [],
      )
      const row = await prisma.dbResource.findUnique({ where: { slug } })
      testResourceIds = row ? [row.id] : []
      const [decoy] = await prisma.$queryRawUnsafe<{ createdAt: Date }[]>(
        `SELECT "createdAt" FROM public."DbResource" WHERE "slug" = $1`,
        slug,
      )
      expect({
        test: row?.createdAt.toISOString(),
        public: decoy?.createdAt.toISOString(),
      }).toEqual({
        test: catalogAddedAt.toISOString(),
        public: publicCreatedAt.toISOString(),
      })
    } finally {
      await prisma.$executeRawUnsafe(
        existing?.exists
          ? `DELETE FROM public."DbResource" WHERE "id" = 'test-sources-schema-isolation-decoy'`
          : `DROP TABLE public."DbResource"`,
      )
    }
  })

  it('removing a source from config deletes only that link', async () => {
    const url1 = 'https://test-sources-remove1.example.com/app1'
    const url2 = 'https://test-sources-remove2.example.com/app2'

    const app1: Resource = {
      id: 'test-sources-remove-app1',
      slug: 'test-sources-remove-app1',
      displayName: 'Test Sources Remove App 1',
      description: 'First test app',
      sources: [url1, url2],
    }
    const app2: Resource = {
      id: 'test-sources-remove-app2',
      slug: 'test-sources-remove-app2',
      displayName: 'Test Sources Remove App 2',
      description: 'Second test app',
      sources: [url1],
    }

    await syncAppCatalog([app1, app2], [], [])

    const synced = await prisma.dbResource.findMany({
      where: {
        slug: { in: ['test-sources-remove-app1', 'test-sources-remove-app2'] },
      },
      orderBy: { slug: 'asc' },
    })
    testResourceIds = synced.map((r) => r.id)

    const app1Updated: Resource = {
      id: 'test-sources-remove-app1',
      slug: 'test-sources-remove-app1',
      displayName: 'Test Sources Remove App 1',
      description: 'First test app',
      sources: [url2],
    }
    await syncAppCatalog([app1Updated, app2], [], [])

    const resource1Links = await prisma.dbResourceSourceUrl.findMany({
      where: { resourceId: synced[0]!.id },
    })
    expect(resource1Links).toHaveLength(1)
    expect(resource1Links[0]!.url).toBe(url2)

    const resource2Links = await prisma.dbResourceSourceUrl.findMany({
      where: { resourceId: synced[1]!.id },
    })
    expect(resource2Links).toHaveLength(1)
    expect(resource2Links[0]!.url).toBe(url1)
  })

  it('removing all sources from an app deletes all its links', async () => {
    const url1 = 'https://test-sources-removeall.example.com/url1'
    const url2 = 'https://test-sources-removeall.example.com/url2'

    const app: Resource = {
      id: 'test-sources-removeall',
      slug: 'test-sources-removeall',
      displayName: 'Test Sources Remove All',
      description: 'Test app',
      sources: [url1, url2],
    }

    await syncAppCatalog([app], [], [])

    const synced = await prisma.dbResource.findUnique({
      where: { slug: 'test-sources-removeall' },
    })
    testResourceIds = synced ? [synced.id] : []

    let links = await prisma.dbResourceSourceUrl.findMany({
      where: { resourceId: synced!.id },
    })
    expect(links).toHaveLength(2)

    await updateApp({
      id: synced!.id,
      data: { sources: [] },
    })

    links = await prisma.dbResourceSourceUrl.findMany({
      where: { resourceId: synced!.id },
    })
    expect(links).toHaveLength(0)
  })

  it('first boot handles duplicate URLs from multiple apps', async () => {
    const sharedUrl = 'https://test-sources-dupboot.example.com/shared'

    const app1: Resource = {
      id: 'test-sources-dupboot1',
      slug: 'test-sources-dupboot1',
      displayName: 'Test Sources Dup Boot 1',
      description: 'First test app',
      sources: [sharedUrl],
    }
    const app2: Resource = {
      id: 'test-sources-dupboot2',
      slug: 'test-sources-dupboot2',
      displayName: 'Test Sources Dup Boot 2',
      description: 'Second test app',
      sources: [
        {
          url: sharedUrl,
          schedule: {
            nextCheckAfter: new Date('2026-12-01T00:00:00Z').toISOString(),
            checkIntervalHours: 48,
          },
        },
      ],
    }

    await syncAppCatalog([app1, app2], [], [])

    const synced = await prisma.dbResource.findMany({
      where: {
        slug: { in: ['test-sources-dupboot1', 'test-sources-dupboot2'] },
      },
      orderBy: { slug: 'asc' },
    })
    testResourceIds = synced.map((r) => r.id)

    const sourceUrl = await prisma.sourceUrl.findUnique({
      where: { url: sharedUrl },
    })
    expect(sourceUrl).toBeTruthy()
    expect(sourceUrl?.checkIntervalHours).toBe(48)

    const links = await prisma.dbResourceSourceUrl.findMany({
      where: { resourceId: { in: testResourceIds } },
    })
    expect(links).toHaveLength(2)
    expect(links.every((l) => l.url === sharedUrl)).toBe(true)
  })

  it('updateApp preserves schedules when editing unrelated app sources', async () => {
    const sharedUrl =
      'https://test-sources-schedule-preserve.example.com/shared'
    const url1 = 'https://test-sources-schedule-preserve.example.com/url1'
    const url2 = 'https://test-sources-schedule-preserve.example.com/url2'

    // App A has shared URL with schedule
    const appA: Resource = {
      id: 'test-sources-schedule-preserve-a',
      slug: 'test-sources-schedule-preserve-a',
      displayName: 'Test Sources Schedule Preserve A',
      description: 'App A with schedule',
      sources: [
        {
          url: sharedUrl,
          schedule: {
            checkIntervalHours: 72,
            nextCheckAfter: new Date('2026-12-15T00:00:00Z').toISOString(),
          },
        },
        {
          url: url1,
        },
      ],
    }

    // App B has shared URL plus another
    const appB: Resource = {
      id: 'test-sources-schedule-preserve-b',
      slug: 'test-sources-schedule-preserve-b',
      displayName: 'Test Sources Schedule Preserve B',
      description: 'App B',
      sources: [sharedUrl, url2],
    }

    await syncAppCatalog([appA, appB], [], [])

    const synced = await prisma.dbResource.findMany({
      where: {
        slug: {
          in: [
            'test-sources-schedule-preserve-a',
            'test-sources-schedule-preserve-b',
          ],
        },
      },
      orderBy: { slug: 'asc' },
    })
    testResourceIds = synced.map((r) => r.id)

    // Verify schedule exists
    let sourceUrl = await prisma.sourceUrl.findUnique({
      where: { url: sharedUrl },
    })
    expect(sourceUrl?.checkIntervalHours).toBe(72)

    // Edit App B's sources (remove shared URL, add something else)
    const appBId = synced.find(
      (r) => r.slug === 'test-sources-schedule-preserve-b',
    )!.id
    await updateApp({
      id: appBId,
      data: {
        sources: [
          url2,
          'https://test-sources-schedule-preserve.example.com/new',
        ],
      },
    })

    // Verify App A's schedule is STILL intact
    sourceUrl = await prisma.sourceUrl.findUnique({
      where: { url: sharedUrl },
    })
    expect(sourceUrl?.checkIntervalHours).toBe(72)
  })
})

if (!TEST_DB_URL) {
  console.log(
    '\n⚠️  Skipping sourcesDb integration tests: AC_TEST_DATABASE_URL not set\n',
  )
}
