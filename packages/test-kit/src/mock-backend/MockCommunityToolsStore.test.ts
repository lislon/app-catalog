import { beforeEach, describe, expect, it } from 'vitest'
import { MockCommunityToolsStore } from './MockCommunityToolsStore'
import { MockUserContext } from './MockUserContext'

describe('MockCommunityToolsStore', () => {
  let store: MockCommunityToolsStore
  let userContext: MockUserContext

  beforeEach(() => {
    userContext = new MockUserContext()
    store = new MockCommunityToolsStore(userContext, ['example.com'])
  })

  it('returns enabled config', () => {
    expect(store.config()).toEqual({ enabled: true })
  })

  it('lists tools with correct data', () => {
    userContext.setUser({ isAuthenticated: false })

    store.withPerson('dana.lee@test.com', 'Dana', 'Lee')
    store.withPerson('sam.ortiz@test.com', 'Sam', 'Ortiz')
    store.withPerson('robin.park@test.com', 'Robin', 'Park')

    store.withTool({
      slug: 'ops-runbook',
      name: 'Ops Runbook',
      url: 'https://ops-runbook-1a2b.pages.example.com/',
      summary: 'Operational procedures',
      descriptionMd: 'Standard operating procedures',
      ownerSlugs: ['dana.lee@test.com'],
      tags: [{ kind: 'topic', value: 'runbook' }],
      views30d: 412,
      viewsAll: 1203,
    })

    store.withTool({
      slug: 'kit-rules-playground',
      name: 'Kit Rules Playground',
      url: 'https://kit-rules-sandbox-7c01.pages.example.com/',
      summary: 'Test environment',
      descriptionMd: 'Sandbox for testing',
      ownerSlugs: ['sam.ortiz@test.com'],
      tags: [{ kind: 'topic', value: 'sandbox' }],
      views30d: 288,
      viewsAll: 288,
    })

    store.withTool({
      slug: 'old-tracker',
      name: 'Old Tracker',
      url: 'https://old-tracker.pages.example.com/',
      summary: 'Legacy issue tracking',
      descriptionMd: 'Original issue tracker',
      ownerSlugs: ['robin.park@test.com'],
      tags: [],
      views30d: 22,
      viewsAll: 22,
    })

    const tools = store.list()
    expect(tools).toHaveLength(3)
    expect(tools[0]?.slug).toBe('ops-runbook')
    expect(tools[0]?.owners).toEqual([
      { slug: 'dana.lee@test.com', name: 'Dana Lee' },
    ])
    expect(tools[0]?.views30d).toBe(412)
    expect(tools[0]?.viewsAll).toBe(1203)
    expect(tools[1]?.slug).toBe('kit-rules-playground')
    expect(tools[2]?.slug).toBe('old-tracker')
  })

  it('gets a single tool', () => {
    userContext.setUser({ isAuthenticated: false })
    store.withPerson('dana.lee@test.com', 'Dana', 'Lee')
    store.withTool({
      slug: 'ops-runbook',
      name: 'Ops Runbook',
      url: 'https://ops-runbook.pages.example.com/',
      summary: 'Ops procedures',
      descriptionMd: 'Standard ops',
      ownerSlugs: ['dana.lee@test.com'],
      tags: [],
    })

    const tool = store.get('ops-runbook')
    expect(tool).toBeTruthy()
    expect(tool?.name).toBe('Ops Runbook')
  })

  it('returns null for unknown tool', () => {
    expect(store.get('unknown')).toBeNull()
  })

  it('preview returns host and captureAllowed', () => {
    userContext.setUser({
      isAuthenticated: true,
      name: 'Test User',
      isAdmin: false,
    })

    const preview = store.preview('https://tool.example.com/')
    expect(preview.host).toBe('tool.example.com')
    expect(preview.captureAllowed).toBe(true)
    expect(preview.duplicate).toBeNull()
  })

  it('preview returns QC Heatmap title for fixture URL', () => {
    userContext.setUser({
      isAuthenticated: true,
      name: 'Test User',
      isAdmin: false,
    })

    const preview = store.preview('https://qc-heatmap-9f8e.pages.example.com/')
    expect(preview.title).toBe('QC Heatmap')
  })

  it('throws UNAUTHORIZED for protected operations when not signed in', () => {
    userContext.setUser({ isAuthenticated: false })

    expect(() => store.recent()).toThrow('UNAUTHORIZED')
    expect(() => store.pin('some-slug')).toThrow('UNAUTHORIZED')
  })

  it('allows signed-in users to access protected operations', () => {
    userContext.setUser({
      isAuthenticated: true,
      name: 'Test User',
      isAdmin: false,
    })

    expect(() => store.recent()).not.toThrow()
    const pins = store.pins()
    expect(Array.isArray(pins)).toBe(true)
  })
})
