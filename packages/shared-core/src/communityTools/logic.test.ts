import { describe, expect, it } from 'vitest'
import type { CommunityTool } from './types'
import {
  hostOf,
  isCaptureAllowed,
  lifecycleOf,
  matchTool,
  nextLifecycle,
  normalizeTags,
  normalizeTopic,
  rankTools,
  searchTools,
} from './logic'

describe('normalizeTopic', () => {
  it('trims, lowercases and turns spaces into dashes', () => {
    expect(normalizeTopic('  Plate   Maps ')).toBe('plate-maps')
    expect(normalizeTopic('qc')).toBe('qc')
  })
})

describe('normalizeTags', () => {
  it('normalises topics only, and keeps each tag once', () => {
    expect(
      normalizeTags([
        { kind: 'topic', value: 'Plate Maps' },
        { kind: 'topic', value: 'plate-maps' },
        { kind: 'app', value: 'Order-Service' },
        { kind: 'topic', value: 'order-service' },
      ]),
    ).toEqual([
      { kind: 'topic', value: 'plate-maps' },
      { kind: 'app', value: 'Order-Service' },
      { kind: 'topic', value: 'order-service' },
    ])
  })
})

// Test fixtures
function opsRunbook(): CommunityTool {
  return {
    slug: 'ops-runbook',
    name: 'Ops Runbook',
    url: 'https://ops-runbook-1a2b.pages.example.com/',
    host: 'ops-runbook-1a2b.pages.example.com',
    summary: 'Operational procedures and guides',
    descriptionMd: 'Internal operations documentation',
    owners: [{ slug: 'dana@example.com', name: 'Dana Lee' }],
    addedBy: { userId: 'user1', name: 'Dana Lee' },
    createdAt: '2026-01-01T00:00:00Z',
    tags: [],
    views30d: 10,
    viewsAll: 100,
    reviewed: true,
    lifecycle: { state: 'active' },
    screenshotId: null,
    faviconId: null,
    capturedAt: null,
    capturePending: false,
    canEdit: false,
  }
}

function tagged(kind: 'app' | 'topic', value: string): CommunityTool {
  return {
    ...opsRunbook(),
    slug: `tagged-${kind}-${value}`,
    tags: [{ kind, value }],
  }
}

function dead(views30d: number): CommunityTool {
  return {
    ...opsRunbook(),
    slug: 'dead',
    views30d,
    lifecycle: { state: 'not-working', days: 5 },
  }
}

function live(views30d: number): CommunityTool {
  return {
    ...opsRunbook(),
    slug: 'live',
    views30d,
    lifecycle: { state: 'active' },
  }
}

function archived(views30d: number): CommunityTool {
  return {
    ...opsRunbook(),
    slug: 'archived',
    views30d,
    lifecycle: {
      state: 'archived',
      by: 'auto',
      reason: 'Failed checks',
      at: '2026-10-01T00:00:00.000Z',
      byName: null,
    },
  }
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

describe('hostOf', () => {
  it('ignores path and query', () => {
    expect(
      hostOf('https://Ops-Runbook-1a2b.pages.example.com/other-page?x=1'),
    ).toBe('ops-runbook-1a2b.pages.example.com')
    expect(hostOf('ops runbook')).toBeNull()
  })

  it('returns null for non-http(s) URLs', () => {
    expect(hostOf('ftp://example.com')).toBeNull()
    expect(hostOf('not a url')).toBeNull()
  })

  it('lowercases the hostname', () => {
    expect(hostOf('https://Example.COM')).toBe('example.com')
  })
})

describe('isCaptureAllowed', () => {
  it('capture allowlist by suffix', () => {
    expect(
      isCaptureAllowed('https://a.pages.example.com/', ['example.com']),
    ).toBe(true)
    expect(isCaptureAllowed('https://evilexample.com/', ['example.com'])).toBe(
      false,
    )
    expect(isCaptureAllowed('http://169.254.169.254/', ['example.com'])).toBe(
      false,
    )
  })

  it('rejects localhost and IP literals', () => {
    expect(isCaptureAllowed('http://localhost:3000/', ['localhost'])).toBe(
      false,
    )
    expect(isCaptureAllowed('http://127.0.0.1/', ['127.0.0.1'])).toBe(false)
    expect(isCaptureAllowed('http://192.168.1.1/', ['example.com'])).toBe(false)
  })

  it('rejects an explicit non-default port', () => {
    const suffixes = ['pages.example.com']
    expect(isCaptureAllowed('https://x.pages.example.com:22/', suffixes)).toBe(
      false,
    )
    expect(isCaptureAllowed('http://x.pages.example.com:8080/', suffixes)).toBe(
      false,
    )
    expect(isCaptureAllowed('https://x.pages.example.com:443/', suffixes)).toBe(
      true,
    )
    expect(isCaptureAllowed('http://x.pages.example.com:80/', suffixes)).toBe(
      true,
    )
  })

  it('allows exact suffix match', () => {
    expect(isCaptureAllowed('https://example.com/', ['example.com'])).toBe(true)
  })
})

describe('matchTool', () => {
  it('tokens match across fields in any order', () => {
    expect(matchTool(opsRunbook(), 'runb dana', {})).toEqual({
      matched: true,
      fields: ['name', 'owner'],
      strength: 2,
    })
    expect(matchTool(opsRunbook(), 'dana zzz', {}).matched).toBe(false)
  })

  it('app tag matches by app display name', () => {
    expect(
      matchTool(tagged('app', 'order-service'), 'order serv', {
        'order-service': 'Order Service',
      }).fields,
    ).toContain('tag')
  })

  it('matches are case-insensitive', () => {
    expect(matchTool(opsRunbook(), 'OPS RUNBOOK', {}).matched).toBe(true)
  })

  it('matches summary and description fields', () => {
    const tool = opsRunbook()
    expect(matchTool(tool, 'operational', {}).fields).toContain('summary')
    expect(matchTool(tool, 'internal', {}).fields).toContain('description')
  })

  it('matches URL address', () => {
    expect(matchTool(opsRunbook(), 'pages.example', {}).fields).toContain(
      'address',
    )
  })

  it('matches topic tags', () => {
    expect(
      matchTool(tagged('topic', 'database'), 'database', {}).fields,
    ).toContain('tag')
  })

  it('returns fields in canonical order', () => {
    const tool = {
      ...opsRunbook(),
      name: 'Tool name',
      summary: 'This is the summary',
      descriptionMd: 'Full description here',
      url: 'https://address.example.com',
      owners: [{ slug: 'user@example.com', name: 'owner person' }],
      tags: [{ kind: 'topic' as const, value: 'tag' }],
    }
    const result = matchTool(
      tool,
      'name summary description owner address tag',
      {},
    )
    expect(result.fields).toEqual([
      'name',
      'summary',
      'description',
      'owner',
      'address',
      'tag',
    ])
  })
})

describe('searchTools', () => {
  const tool = (
    slug: string,
    patch: Partial<CommunityTool>,
  ): CommunityTool => ({
    ...opsRunbook(),
    slug,
    name: slug,
    summary: '',
    descriptionMd: '',
    url: `https://${slug}.pages.example.com/`,
    owners: [{ slug: 'sam@example.com', name: 'Sam Ortiz' }],
    ...patch,
  })

  it('orders by match strength, and views only break ties', () => {
    const byTag = tool('Deploy Notes', {
      tags: [{ kind: 'topic', value: 'runbook' }],
      views30d: 90,
    })
    const bySummary = tool('Shift Guide', {
      summary: 'The on-call runbook',
      views30d: 50,
    })
    const byNameQuiet = tool('Runbook Lite', { views30d: 1 })
    const byNameBusy = tool('Runbook Pro', { views30d: 20 })
    expect(
      searchTools(
        [byTag, bySummary, byNameQuiet, byNameBusy],
        'runbook',
        {},
        'month',
      ).map((r) => r.tool.slug),
    ).toEqual(['Runbook Pro', 'Runbook Lite', 'Shift Guide', 'Deploy Notes'])
  })

  it('keeps archived matches, last, with the fields they matched', () => {
    const results = searchTools([archived(900), live(3)], 'ops', {}, 'month')
    expect(results.map((r) => r.tool.slug)).toEqual(['live', 'archived'])
    expect(results[0]!.fields).toEqual(['name'])
  })
})

describe('rankTools', () => {
  it('rank: archived dropped, not-working sinks', () => {
    expect(
      rankTools([dead(500), live(3), archived(900)], 'month').map(
        (t) => t.slug,
      ),
    ).toEqual(['live', 'dead'])
  })

  it('sorts by views30d in month window', () => {
    expect(
      rankTools([live(10), live(50), live(30)], 'month').map((t) => t.views30d),
    ).toEqual([50, 30, 10])
  })

  it('sorts by viewsAll in all window', () => {
    const tools = [
      { ...live(10), viewsAll: 100 },
      { ...live(50), viewsAll: 200 },
      { ...live(30), viewsAll: 150 },
    ]
    expect(rankTools(tools, 'all').map((t) => t.viewsAll)).toEqual([
      200, 150, 100,
    ])
  })

  it('sorts by createdAt desc in newest window', () => {
    const tools = [
      { ...live(10), createdAt: '2026-01-01T00:00:00Z' },
      { ...live(50), createdAt: '2026-03-01T00:00:00Z' },
      { ...live(30), createdAt: '2026-02-01T00:00:00Z' },
    ]
    expect(rankTools(tools, 'newest').map((t) => t.createdAt)).toEqual([
      '2026-03-01T00:00:00Z',
      '2026-02-01T00:00:00Z',
      '2026-01-01T00:00:00Z',
    ])
  })

  it('breaks ties by name', () => {
    const tools = [
      { ...live(10), name: 'Charlie' },
      { ...live(10), name: 'Alice' },
      { ...live(10), name: 'Bob' },
    ]
    expect(rankTools(tools, 'month').map((t) => t.name)).toEqual([
      'Alice',
      'Bob',
      'Charlie',
    ])
  })
})

describe('lifecycle', () => {
  it('lifecycle: fail streak, 30-day archive, recovery, person archive sticks', () => {
    const d0 = new Date('2026-10-01T00:00:00Z')

    // First failure starts the streak
    expect(
      nextLifecycle(
        { failingSince: null, archivedAt: null, archivedBy: null },
        false,
        d0,
      ),
    ).toEqual({ failingSince: d0 })

    // 30 days of failure triggers auto-archive
    expect(
      nextLifecycle(
        { failingSince: d0, archivedAt: null, archivedBy: null },
        false,
        addDays(d0, 30),
      ),
    ).toMatchObject({ archivedBy: 'auto' })

    // Recovery clears auto-archive
    expect(
      nextLifecycle(
        { failingSince: d0, archivedAt: addDays(d0, 30), archivedBy: 'auto' },
        true,
        addDays(d0, 31),
      ),
    ).toEqual({
      failingSince: null,
      archivedAt: null,
      archivedBy: null,
    })

    // Person archive sticks even on success
    expect(
      nextLifecycle(
        { failingSince: null, archivedAt: d0, archivedBy: 'Dana Lee' },
        true,
        d0,
      ),
    ).toEqual({})

    // lifecycleOf computes days correctly
    expect(
      lifecycleOf(
        {
          failingSince: d0,
          archivedAt: null,
          archivedBy: null,
          archivedReason: null,
        },
        addDays(d0, 3),
      ),
    ).toEqual({ state: 'not-working', days: 3 })
  })

  it('lifecycleOf: counts whole days of the streak, at least one', () => {
    const now = new Date('2026-10-21T12:00:00Z')
    const failingFor = (ms: number) =>
      lifecycleOf(
        {
          failingSince: new Date(now.getTime() - ms),
          archivedAt: null,
          archivedBy: null,
          archivedReason: null,
        },
        now,
      )
    const HOUR = 60 * 60 * 1000
    // A streak that began 3 days ago, a little before this check, is 3 days.
    expect(failingFor(3 * 24 * HOUR + 60_000)).toEqual({
      state: 'not-working',
      days: 3,
    })
    expect(failingFor(2 * HOUR)).toEqual({ state: 'not-working', days: 1 })
  })

  it('lifecycleOf: active when not failing or archived', () => {
    expect(
      lifecycleOf(
        {
          failingSince: null,
          archivedAt: null,
          archivedBy: null,
          archivedReason: null,
        },
        new Date(),
      ),
    ).toEqual({ state: 'active' })
  })

  it('lifecycleOf: archived state includes by, reason, when and who', () => {
    const d0 = new Date('2026-10-01T00:00:00Z')
    expect(
      lifecycleOf(
        {
          failingSince: null,
          archivedAt: d0,
          archivedBy: 'auto',
          archivedReason: 'Failed checks',
        },
        d0,
      ),
    ).toEqual({
      state: 'archived',
      by: 'auto',
      reason: 'Failed checks',
      at: '2026-10-01T00:00:00.000Z',
      byName: null,
    })

    expect(
      lifecycleOf(
        {
          failingSince: null,
          archivedAt: d0,
          archivedBy: 'Dana Lee',
          archivedReason: null,
        },
        d0,
      ),
    ).toEqual({
      state: 'archived',
      by: 'person',
      reason: null,
      at: '2026-10-01T00:00:00.000Z',
      byName: 'Dana Lee',
    })
  })

  it('nextLifecycle: success clears failing streak when not archived', () => {
    const d0 = new Date('2026-10-01T00:00:00Z')
    expect(
      nextLifecycle(
        { failingSince: d0, archivedAt: null, archivedBy: null },
        true,
        addDays(d0, 5),
      ),
    ).toEqual({ failingSince: null })
  })

  it('nextLifecycle: continued failure does nothing before 30 days', () => {
    const d0 = new Date('2026-10-01T00:00:00Z')
    expect(
      nextLifecycle(
        { failingSince: d0, archivedAt: null, archivedBy: null },
        false,
        addDays(d0, 15),
      ),
    ).toEqual({})
  })

  it('lifecycleOf: days is at least 1', () => {
    const d0 = new Date('2026-10-01T00:00:00Z')
    // Same day
    const lifecycle1 = lifecycleOf(
      {
        failingSince: d0,
        archivedAt: null,
        archivedBy: null,
        archivedReason: null,
      },
      d0,
    )
    expect(lifecycle1).toMatchObject({ state: 'not-working', days: 1 })

    // Within first day
    const d1 = new Date(d0.getTime() + 6 * 60 * 60 * 1000) // 6 hours later
    const lifecycle2 = lifecycleOf(
      {
        failingSince: d0,
        archivedAt: null,
        archivedBy: null,
        archivedReason: null,
      },
      d1,
    )
    expect(lifecycle2).toMatchObject({ state: 'not-working', days: 1 })
  })
})
