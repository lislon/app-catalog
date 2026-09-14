import { describe, expect, it } from 'vitest'
import type { SearchableResource } from '../searchResources'
import {
  searchResources,
  searchResourcesRanked,
  searchWithinApp,
} from '../searchResources'

function makeApp(
  overrides: Partial<SearchableResource> & { slug: string },
): SearchableResource {
  return {
    displayName: overrides.slug,
    ...overrides,
  }
}

function makeChildResource(
  overrides: Partial<SearchableResource> & {
    slug: string
    parentSlug: string
  },
): SearchableResource {
  return {
    displayName: overrides.slug,
    aliases: [],
    ...overrides,
  }
}

describe('searchResources', () => {
  const apps: SearchableResource[] = [
    makeApp({
      slug: 'taskflow',
      displayName: 'TaskFlow',
      description: 'Issue tracker',
    }),
    makeApp({
      slug: 'aws-console',
      displayName: 'AWS Console',
      description: 'Cloud management',
    }),
    makeApp({
      slug: 'teamchat',
      displayName: 'TeamChat',
      description: 'Messaging',
    }),
  ]

  it('returns all root apps when query is empty', () => {
    expect(searchResources(apps, '')).toHaveLength(3)
  })

  it('finds app by displayName', () => {
    const results = searchResources(apps, 'taskflow')
    expect(results).toHaveLength(1)
    expect(results[0]!.slug).toBe('taskflow')
  })

  it('finds app by nickname and by abbreviation', () => {
    const withAliases = [
      ...apps,
      makeApp({
        slug: 'lab-system',
        displayName: 'Laboratory System',
        abbreviation: 'LS',
        nicknames: ['labsys'],
      }),
    ]
    expect(searchResources(withAliases, 'labsys')[0]!.slug).toBe('lab-system')
    expect(searchResources(withAliases, 'ls')[0]!.slug).toBe('lab-system')
  })

  describe('child resource search', () => {
    const childResources: SearchableResource[] = [
      makeChildResource({
        slug: 'aws-acme-pipelines-dev',
        displayName: 'acme-pipelines-data-analytics-dev',
        parentSlug: 'aws-console',
        aliases: ['000000000001'],
      }),
      makeChildResource({
        slug: 'aws-acme-infosec-dev',
        displayName: 'acme-infosec-dev',
        parentSlug: 'aws-console',
        aliases: [],
      }),
    ]

    const allResources = [...apps, ...childResources]

    it('finds app by child resource displayName', () => {
      const results = searchResources(allResources, 'pipelines data-analytics')
      expect(results).toHaveLength(1)
      expect(results[0]!.slug).toBe('aws-console')
    })

    it('finds app by child resource alias (numeric account identifier)', () => {
      const results = searchResources(allResources, '000000000001')
      expect(results).toHaveLength(1)
      expect(results[0]!.slug).toBe('aws-console')
    })

    it('does not match child resources when none provided', () => {
      const results = searchResources(apps, '000000000001')
      expect(results).toHaveLength(0)
    })

    it('direct app match ranks higher than child resource match', () => {
      const results = searchResources(allResources, 'aws')
      // 'aws-console' matches by displayName, should appear
      expect(results.length).toBeGreaterThanOrEqual(1)
      expect(results[0]!.slug).toBe('aws-console')
    })

    it('never returns children from the roots-only roll-up', () => {
      const results = searchResources(allResources, '')
      expect(results.map((r) => r.slug)).toEqual([
        'taskflow',
        'aws-console',
        'teamchat',
      ])
    })
  })
})

describe('searchResourcesRanked', () => {
  const apps: SearchableResource[] = [
    makeApp({ slug: 'taskflow', displayName: 'TaskFlow' }),
    makeApp({
      slug: 'teamchat',
      displayName: 'TeamChat',
      description: 'taskflow rival',
    }),
  ]

  it('reports which field matched and how', () => {
    const results = searchResourcesRanked(apps, 'taskflow')
    expect(
      results.map((r) => [r.app.slug, r.match?.field, r.match?.type]),
    ).toEqual([
      ['taskflow', 'displayName', 'exact'],
      ['teamchat', 'description', 'contains'],
    ])
  })

  it('returns the same order as searchResources', () => {
    expect(searchResourcesRanked(apps, 'taskflow').map((r) => r.app)).toEqual(
      searchResources(apps, 'taskflow'),
    )
  })
})

describe('searchWithinApp', () => {
  const resources: SearchableResource[] = [
    makeApp({ slug: 'aws-console', displayName: 'AWS Console' }),
    makeApp({ slug: 'taskflow', displayName: 'TaskFlow' }),
    makeChildResource({
      slug: 'aws-acme-biomarkers-prod',
      displayName: 'acme-biomarkers-prod',
      parentSlug: 'aws-console',
      aliases: ['000000000001'],
      description: 'Cloud account: acme-biomarkers-prod',
    }),
    makeChildResource({
      slug: 'aws-acme-biomarkers-dev',
      displayName: 'acme-biomarkers-dev',
      parentSlug: 'aws-console',
      aliases: ['000000000002'],
    }),
    makeChildResource({
      slug: 'aws-acme-infosec-dev',
      displayName: 'acme-infosec-dev',
      parentSlug: 'aws-console',
      aliases: ['000000000003'],
    }),
    makeChildResource({
      slug: 'tf-child',
      displayName: 'biomarkers-board',
      parentSlug: 'taskflow',
      aliases: [],
    }),
  ]

  it('searches only the named app’s children', () => {
    const results = searchWithinApp(resources, 'aws-console', 'biomarkers')
    expect(results.map((r) => r.app.slug)).toEqual([
      'aws-acme-biomarkers-dev',
      'aws-acme-biomarkers-prod',
    ])
  })

  it('matches a bare numeric alias — the account-number lookup', () => {
    const results = searchWithinApp(resources, 'aws-console', '000000000001')
    expect(results).toHaveLength(1)
    expect(results[0]!.app.slug).toBe('aws-acme-biomarkers-prod')
    expect(results[0]!.match).toEqual({ field: 'aliases', type: 'exact' })
  })

  it('matches on slug and on description', () => {
    expect(
      searchWithinApp(resources, 'aws-console', 'aws-acme-infosec-dev'),
    ).toHaveLength(1)
    expect(
      searchWithinApp(resources, 'aws-console', 'cloud account'),
    ).toHaveLength(1)
  })

  it('returns every child for an empty query, alphabetically', () => {
    expect(
      searchWithinApp(resources, 'aws-console', '').map((r) => r.app.slug),
    ).toEqual([
      'aws-acme-biomarkers-dev',
      'aws-acme-biomarkers-prod',
      'aws-acme-infosec-dev',
    ])
  })

  it('returns nothing for an app without children or a miss', () => {
    expect(searchWithinApp(resources, 'nope', 'biomarkers')).toEqual([])
    expect(searchWithinApp(resources, 'aws-console', 'zzzz')).toEqual([])
  })
})
