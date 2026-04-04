import { describe, expect, it } from 'vitest'
import type {
  AppForCatalog,
  SubResource,
} from '@igstack/app-catalog-backend-core'
import { searchApps } from '~/modules/appCatalog/utils/searchApps'

function makeApp(
  overrides: Partial<AppForCatalog> & { slug: string },
): AppForCatalog {
  return {
    id: overrides.slug,
    displayName: overrides.slug,
    ...overrides,
  }
}

function makeSubResource(
  overrides: Partial<SubResource> & { slug: string; appSlug: string },
): SubResource {
  return {
    displayName: overrides.slug,
    aliases: [],
    accessMaintainerGroupSlugs: [],
    ...overrides,
  }
}

describe('searchApps', () => {
  const apps: AppForCatalog[] = [
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

  it('returns all apps when query is empty', () => {
    expect(searchApps(apps, '')).toHaveLength(3)
  })

  it('finds app by displayName', () => {
    const results = searchApps(apps, 'jira')
    expect(results).toHaveLength(1)
    expect(results[0]!.slug).toBe('jira')
  })

  describe('sub-resource search', () => {
    const subResources: SubResource[] = [
      makeSubResource({
        slug: 'aws-natera-pipelines-dev',
        displayName: 'natera-pipelines-biomarkers-ici-dev',
        appSlug: 'aws-console',
        aliases: ['043902793406'],
      }),
      makeSubResource({
        slug: 'aws-natera-infosec-dev',
        displayName: 'natera-infosec-dev',
        appSlug: 'aws-console',
        aliases: [],
      }),
    ]

    it('finds app by sub-resource displayName', () => {
      const results = searchApps(apps, 'pipelines biomarkers', subResources)
      expect(results).toHaveLength(1)
      expect(results[0]!.slug).toBe('aws-console')
    })

    it('finds app by sub-resource alias (account ID)', () => {
      const results = searchApps(apps, '043902793406', subResources)
      expect(results).toHaveLength(1)
      expect(results[0]!.slug).toBe('aws-console')
    })

    it('does not match sub-resources when no subResources provided', () => {
      const results = searchApps(apps, '043902793406')
      expect(results).toHaveLength(0)
    })

    it('direct app match ranks higher than sub-resource match', () => {
      const results = searchApps(apps, 'aws', subResources)
      // 'aws-console' matches by displayName, should appear
      expect(results.length).toBeGreaterThanOrEqual(1)
      expect(results[0]!.slug).toBe('aws-console')
    })
  })
})
