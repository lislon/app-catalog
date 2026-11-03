// @vitest-environment node
/**
 * DB-backed integration tests for sources module.
 * Requires AC_TEST_DATABASE_URL pointing to a Postgres instance (not a specific database).
 * Creates and drops a throwaway schema per test run.
 */
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { PrismaClient } from '../generated/prisma/client'
import { syncAppCatalog } from '../db/syncAppCatalog'
import {
  getResourcesFromPrisma,
  updateApp,
} from '../modules/appCatalog/service'
import type { Resource } from '../types/common/appCatalogTypes'
import { execSync } from 'node:child_process'
import * as dbClient from '../db/client'

const TEST_DB_URL = process.env.AC_TEST_DATABASE_URL
const shouldSkip = !TEST_DB_URL

describe.skipIf(shouldSkip)('sourcesDb integration', () => {
  let prisma: PrismaClient
  let testSchema: string
  let testResourceIds: string[] = []

  beforeAll(async () => {
    if (!TEST_DB_URL) {
      console.log('Skipping: AC_TEST_DATABASE_URL not set')
      return
    }

    // Create throwaway schema
    testSchema = `test_sources_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const schemaUrl = `${TEST_DB_URL}?schema=${testSchema}`

    // Create schema
    execSync(`psql "${TEST_DB_URL}" -c "CREATE SCHEMA \\"${testSchema}\\""`, {
      stdio: 'inherit',
    })

    // Push Prisma schema to test schema
    execSync(
      `pnpm exec prisma db push --accept-data-loss --url="${schemaUrl}"`,
      {
        cwd: '/Users/igolovin/src/ig-umbrella/ac-mcp/packages/backend-core',
        stdio: 'inherit',
      },
    )

    // Create Prisma client for test schema using adapter
    const { Pool } = await import('pg')
    const pool = new Pool({ connectionString: schemaUrl })
    const { PrismaPg } = await import('@prisma/adapter-pg')
    const adapter = new PrismaPg(pool, { schema: testSchema })
    prisma = new PrismaClient({ adapter })
    await prisma.$connect()

    // Mock getDbClient to return our test client
    vi.spyOn(dbClient, 'getDbClient').mockReturnValue(prisma)
  })

  afterAll(async () => {
    if (!TEST_DB_URL || !testSchema) return

    await prisma.$disconnect()

    // Drop schema
    try {
      execSync(
        `psql "${TEST_DB_URL}" -c "DROP SCHEMA IF EXISTS \\"${testSchema}\\" CASCADE"`,
        { stdio: 'inherit' },
      )
    } catch (e) {
      console.error('Failed to drop test schema:', e)
    }

    // Restore original getDbClient
    vi.restoreAllMocks()
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

    expect(source?.pulse).toMatchObject({
      cadence: 'daily',
      state: 'ok',
      intervalHours: 24,
    })
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

if (shouldSkip) {
  console.log(
    '\n⚠️  Skipping sourcesDb integration tests: AC_TEST_DATABASE_URL not set\n',
  )
}
