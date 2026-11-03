// @vitest-environment node
/**
 * DB-backed integration tests for sources module.
 * Requires AC_CORE_DATABASE_URL pointing to a disposable test database.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getDbClient } from '../db/client'
import { syncAppCatalog } from '../db/syncAppCatalog'
import {
  getResourcesFromPrisma,
  updateApp,
} from '../modules/appCatalog/service'
import type { Resource } from '../types/common/appCatalogTypes'

describe('sourcesDb integration', () => {
  let testResourceIds: string[] = []

  beforeEach(async () => {
    testResourceIds = []
  })

  afterEach(async () => {
    const prisma = getDbClient()
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
    const prisma = getDbClient()
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
    const prisma = getDbClient()
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

    expect(source?.pulse).toBeTruthy()
    expect(source?.pulse?.cadence).toBe('daily')
    expect(source?.pulse?.state).toBeTruthy()
  })

  it('removing a source from config deletes only that link', async () => {
    const prisma = getDbClient()
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
    const prisma = getDbClient()
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

    const appNoSources: Resource = {
      id: 'test-sources-removeall',
      slug: 'test-sources-removeall',
      displayName: 'Test Sources Remove All',
      description: 'Test app',
      sources: [],
    }
    await syncAppCatalog([appNoSources], [], [])

    links = await prisma.dbResourceSourceUrl.findMany({
      where: { resourceId: synced!.id },
    })
    expect(links).toHaveLength(0)
  })

  it('first boot handles duplicate URLs from multiple apps', async () => {
    const prisma = getDbClient()
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
})
