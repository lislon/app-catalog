import { describe, expect, it } from 'vitest'
import type { SearchableResource } from '../searchResources'
import {
  cyrillicLayoutToLatin,
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

describe('whitespace-insensitive name matching', () => {
  const apps: SearchableResource[] = [
    makeApp({
      slug: 'acme-portals',
      displayName: 'Acme Portals',
      description: 'Landing page for every portal',
    }),
    makeApp({
      slug: 'ledger',
      displayName: 'Ledger',
      description: 'Bookkeeping for the acme pro programme',
    }),
    makeApp({
      slug: 'acme-pro',
      displayName: 'AcmePro / Partner Portal',
      description: 'Partner-facing ordering portal',
    }),
    makeApp({ slug: 'labvantage', displayName: 'LabVantage' }),
  ]

  it('ranks a CamelCase name typed as two words above description hits', () => {
    const results = searchResourcesRanked(apps, 'acme pro')
    expect(
      results.map((r) => [r.app.slug, r.match?.field, r.match?.type]),
    ).toEqual([
      ['acme-pro', 'displayName', 'prefix'],
      ['ledger', 'description', 'contains'],
    ])
  })

  it('does not let the two-word query prefix-match a different name', () => {
    expect(searchResources(apps, 'acme pro').map((a) => a.slug)).not.toContain(
      'acme-portals',
    )
  })

  it('matches exact and prefix ignoring whitespace', () => {
    expect(searchResourcesRanked(apps, 'lab vantage')[0]!.match).toEqual({
      field: 'displayName',
      type: 'exact',
    })
    expect(searchResourcesRanked(apps, 'lab vant')[0]!.match).toEqual({
      field: 'displayName',
      type: 'prefix',
    })
  })

  it('applies to abbreviations and nicknames too', () => {
    const withAliases = [
      ...apps,
      makeApp({
        slug: 'lims',
        displayName: 'Laboratory Information System',
        abbreviation: 'L.I.S.',
        nicknames: ['LabInfo'],
      }),
    ]
    expect(searchResourcesRanked(withAliases, 'lis')[0]!.match).toEqual({
      field: 'abbreviation',
      type: 'exact',
    })
    expect(searchResourcesRanked(withAliases, 'lab info')[0]!.match).toEqual({
      field: 'nicknames',
      type: 'exact',
    })
  })

  it('applies inside one app too', () => {
    const resources: SearchableResource[] = [
      makeApp({ slug: 'cloud', displayName: 'Cloud' }),
      makeChildResource({
        slug: 'cloud-prod',
        displayName: 'ProdAccount',
        parentSlug: 'cloud',
      }),
    ]
    expect(
      searchWithinApp(resources, 'cloud', 'prod account')[0]!.match,
    ).toEqual({ field: 'displayName', type: 'exact' })
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

describe('cyrillicLayoutToLatin', () => {
  it('maps Cyrillic keys to the Latin characters on the same physical keys', () => {
    expect(cyrillicLayoutToLatin('пфещк')).toBe('gator')
    expect(cyrillicLayoutToLatin('йцукен')).toBe('qwerty')
    expect(cyrillicLayoutToLatin('фыв ячс')).toBe('asd zxc')
  })

  it('leaves characters it has no key for untouched', () => {
    expect(cyrillicLayoutToLatin('gator')).toBe('gator')
    expect(cyrillicLayoutToLatin('п1ф')).toBe('g1a')
  })
})

describe('Cyrillic-layout fallback', () => {
  const apps: SearchableResource[] = [
    makeApp({ slug: 'gator', displayName: 'Gator' }),
    makeApp({ slug: 'taskflow', displayName: 'TaskFlow', abbreviation: 'tf' }),
  ]

  it('finds the app typed on the wrong keyboard layout', () => {
    const results = searchResources(apps, 'Пфещк')
    expect(results.map((a) => a.slug)).toEqual(['gator'])
  })

  it('does not re-run when the query as typed already has results', () => {
    const withCyrillicText = [
      ...apps,
      makeApp({ slug: 'notes', displayName: 'Notes', description: 'пфещк' }),
    ]
    expect(
      searchResources(withCyrillicText, 'пфещк').map((a) => a.slug),
    ).toEqual(['notes'])
  })

  it('returns nothing for a Cyrillic query that maps to nothing', () => {
    expect(searchResources(apps, 'щщщ')).toEqual([])
  })

  it('keeps the match info of the fallback pass', () => {
    const results = searchResourcesRanked(apps, 'Пфещк')
    expect(results[0]!.match).toEqual({ field: 'displayName', type: 'exact' })
  })

  it('applies inside one app too — the "<app>/<term>" form', () => {
    const resources: SearchableResource[] = [
      makeApp({ slug: 'aws-console', displayName: 'AWS Console' }),
      makeChildResource({
        slug: 'aws-prod',
        displayName: 'prod-account',
        parentSlug: 'aws-console',
      }),
    ]
    const results = searchWithinApp(resources, 'aws-console', 'ЗКЩВ')
    expect(results.map((r) => r.app.slug)).toEqual(['aws-prod'])
  })
})
