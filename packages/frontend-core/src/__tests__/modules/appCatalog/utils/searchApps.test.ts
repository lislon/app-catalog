import { describe, expect, it } from 'vitest'
import type { Resource } from '@igstack/app-catalog-backend-core'
import { searchResources } from '~/modules/appCatalog/utils/searchApps'

function makeApp(overrides: Partial<Resource> & { slug: string }): Resource {
  return {
    id: overrides.slug,
    displayName: overrides.slug,
    ...overrides,
  }
}

function makeChildResource(
  overrides: Partial<Resource> & { slug: string; parentSlug: string },
): Resource {
  return {
    id: overrides.slug,
    displayName: overrides.slug,
    aliases: [],
    accessMaintainerGroupSlugs: [],
    ...overrides,
  }
}

describe('searchResources', () => {
  const apps: Resource[] = [
    makeApp({
      slug: 'jira',
      displayName: 'Jira',
      description: 'Issue tracker',
    }),
    makeApp({
      slug: 'aws-console',
      displayName: 'AWS Console',
      description: 'Cloud management',
    }),
    makeApp({ slug: 'slack', displayName: 'Slack', description: 'Messaging' }),
  ]

  it('returns all root apps when query is empty', () => {
    expect(searchResources(apps, '')).toHaveLength(3)
  })

  it('finds app by displayName', () => {
    const results = searchResources(apps, 'jira')
    expect(results).toHaveLength(1)
    expect(results[0]!.slug).toBe('jira')
  })

  describe('child resource search', () => {
    const childResources: Resource[] = [
      makeChildResource({
        slug: 'aws-acme-pipelines-dev',
        displayName: 'acme-pipelines-biomarkers-ici-dev',
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
      const results = searchResources(allResources, 'pipelines biomarkers')
      expect(results).toHaveLength(1)
      expect(results[0]!.slug).toBe('aws-console')
    })

    it('finds app by child resource alias (account ID)', () => {
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
  })
})
