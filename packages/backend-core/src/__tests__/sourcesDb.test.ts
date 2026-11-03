// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getDbClient } from '../db/client'
import {
  syncSourceLinks,
  syncSourceUrls,
  toSourceReference,
} from '../modules/sources/sourcesDb'
import type { SourceReference } from '../types/common/appCatalogTypes'

describe('sourcesDb', () => {
  let testResourceIds: string[]

  beforeEach(async () => {
    const prisma = getDbClient()

    // Clean up existing test data
    await prisma.dbResourceSourceUrl.deleteMany({})
    await prisma.sourceUrl.deleteMany({})
    await prisma.source.deleteMany({})
    await prisma.dbResource.deleteMany({})

    // Create test resources
    const res1 = await prisma.dbResource.create({
      data: {
        slug: 'test-app-1',
        displayName: 'Test App 1',
        description: 'First test app',
      },
    })
    const res2 = await prisma.dbResource.create({
      data: {
        slug: 'test-app-2',
        displayName: 'Test App 2',
        description: 'Second test app',
      },
    })
    testResourceIds = [res1.id, res2.id]
  })

  afterEach(async () => {
    const prisma = getDbClient()
    await prisma.dbResourceSourceUrl.deleteMany({})
    await prisma.sourceUrl.deleteMany({})
    await prisma.source.deleteMany({})
    await prisma.dbResource.deleteMany({})
  })

  it('two apps citing one URL share one SourceUrl row', async () => {
    const prisma = getDbClient()
    const sharedUrl = 'https://docs.example.com/guide'
    const sourceRefs: SourceReference[] = [
      { url: sharedUrl, sourceSlug: 'docs-example' },
      { url: 'https://github.com/example/app1', sourceSlug: 'github' },
    ]

    // Sync sources
    await syncSourceUrls(prisma, sourceRefs)

    // Link first app
    await syncSourceLinks(prisma, 'DbResourceSourceUrl', 'resourceId', [
      { owner: testResourceIds[0], url: sharedUrl },
      { owner: testResourceIds[0], url: 'https://github.com/example/app1' },
    ])

    // Link second app with the shared URL
    await syncSourceLinks(prisma, 'DbResourceSourceUrl', 'resourceId', [
      { owner: testResourceIds[1], url: sharedUrl },
    ])

    // Verify only one SourceUrl row for the shared URL
    const count = await prisma.sourceUrl.count({
      where: { url: sharedUrl },
    })
    expect(count).toBe(1)

    // Verify both resources can read back the shared URL
    const resource1 = await prisma.dbResource.findUnique({
      where: { id: testResourceIds[0] },
      include: { sourceLinks: { include: { sourceUrl: true } } },
    })
    const resource2 = await prisma.dbResource.findUnique({
      where: { id: testResourceIds[1] },
      include: { sourceLinks: { include: { sourceUrl: true } } },
    })

    expect(resource1?.sourceLinks.some((link) => link.url === sharedUrl)).toBe(
      true,
    )
    expect(resource2?.sourceLinks.some((link) => link.url === sharedUrl)).toBe(
      true,
    )
  })

  it('schedule from an enriched source survives sync', async () => {
    const prisma = getDbClient()
    const url = 'https://api.example.com/docs'
    const nextCheckAfter = new Date('2026-12-01T00:00:00Z')
    const lastCheckedAt = new Date('2026-11-01T00:00:00Z')
    const lastContentChangeAt = new Date('2026-10-15T00:00:00Z')

    const sourceRef: SourceReference = {
      url,
      sourceSlug: 'api-example',
      schedule: {
        nextCheckAfter: nextCheckAfter.toISOString(),
        lastCheckedAt: lastCheckedAt.toISOString(),
        lastContentChangeAt: lastContentChangeAt.toISOString(),
        checkIntervalHours: 24,
        changeHistory: [{ date: '2026-10-15T00:00:00Z', changed: true }],
      },
    }

    await syncSourceUrls(prisma, [sourceRef])

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

    // Read back via toSourceReference and verify pulse is computed
    const readBack = toSourceReference(sourceUrl!)
    expect(readBack.url).toBe(url)
    expect(readBack.sourceSlug).toBe('api-example')
    expect(readBack.pulse).toBeTruthy()
  })

  it('removing a source from config deletes only that link', async () => {
    const prisma = getDbClient()
    const url1 = 'https://docs.example.com/app1'
    const url2 = 'https://docs.example.com/app2'

    await syncSourceUrls(prisma, [
      { url: url1, sourceSlug: 'docs-example' },
      { url: url2, sourceSlug: 'docs-example' },
    ])

    // Link both URLs to first resource
    await syncSourceLinks(prisma, 'DbResourceSourceUrl', 'resourceId', [
      { owner: testResourceIds[0], url: url1 },
      { owner: testResourceIds[0], url: url2 },
    ])

    // Link url1 to second resource
    await syncSourceLinks(prisma, 'DbResourceSourceUrl', 'resourceId', [
      { owner: testResourceIds[1], url: url1 },
    ])

    // Now sync first resource again without url1
    await syncSourceLinks(prisma, 'DbResourceSourceUrl', 'resourceId', [
      { owner: testResourceIds[0], url: url2 },
    ])

    // Verify first resource only has url2
    const resource1Links = await prisma.dbResourceSourceUrl.findMany({
      where: { resourceId: testResourceIds[0] },
    })
    expect(resource1Links).toHaveLength(1)
    expect(resource1Links[0].url).toBe(url2)

    // Verify second resource still has url1
    const resource2Links = await prisma.dbResourceSourceUrl.findMany({
      where: { resourceId: testResourceIds[1] },
    })
    expect(resource2Links).toHaveLength(1)
    expect(resource2Links[0].url).toBe(url1)
  })

  it("updateApp replaces this app's links only", async () => {
    const prisma = getDbClient()
    const url1 = 'https://docs.example.com/shared'
    const url2 = 'https://github.com/example/app1'
    const url3 = 'https://github.com/example/app2'

    await syncSourceUrls(prisma, [
      { url: url1, sourceSlug: 'docs-example' },
      { url: url2, sourceSlug: 'github' },
      { url: url3, sourceSlug: 'github' },
    ])

    // Both resources cite url1 initially
    await syncSourceLinks(prisma, 'DbResourceSourceUrl', 'resourceId', [
      { owner: testResourceIds[0], url: url1 },
      { owner: testResourceIds[0], url: url2 },
    ])
    await syncSourceLinks(prisma, 'DbResourceSourceUrl', 'resourceId', [
      { owner: testResourceIds[1], url: url1 },
    ])

    // Update first resource to use url3 instead of url2, keeping url1
    await syncSourceLinks(prisma, 'DbResourceSourceUrl', 'resourceId', [
      { owner: testResourceIds[0], url: url1 },
      { owner: testResourceIds[0], url: url3 },
    ])

    // Verify first resource has url1 and url3
    const resource1Links = await prisma.dbResourceSourceUrl.findMany({
      where: { resourceId: testResourceIds[0] },
    })
    expect(resource1Links).toHaveLength(2)
    expect(resource1Links.map((l) => l.url).sort()).toEqual([url1, url3].sort())

    // Verify second resource still has only url1
    const resource2Links = await prisma.dbResourceSourceUrl.findMany({
      where: { resourceId: testResourceIds[1] },
    })
    expect(resource2Links).toHaveLength(1)
    expect(resource2Links[0].url).toBe(url1)
  })
})
