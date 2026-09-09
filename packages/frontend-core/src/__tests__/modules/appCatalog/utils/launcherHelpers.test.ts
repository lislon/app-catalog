import { describe, expect, it } from 'vitest'
import type { Resource } from '@igstack/app-catalog-backend-core'
import { pickNewThisWeek } from '~/modules/appCatalog/utils/launcherHelpers'

const NOW = new Date('2026-09-09T12:00:00Z').getTime()
const daysAgo = (n: number) => new Date(NOW - n * 86400_000).toISOString()

const app = (slug: string, over: Partial<Resource> = {}) =>
  ({ slug, displayName: slug, ...over }) as Resource

describe('pickNewThisWeek', () => {
  it('excludes an old app whose content was merely re-checked this week (#96 Histology repro)', () => {
    const histology = app('histology', {
      createdAt: daysAgo(120),
      freshness: { lastContentChangeAt: daysAgo(5), lastCheckedAt: daysAgo(1) },
    } as Partial<Resource>)
    expect(pickNewThisWeek([histology], NOW)).toEqual([])
  })

  it('includes an app added within the last 7 days', () => {
    const brandNew = app('brand-new', { createdAt: daysAgo(2) })
    expect(pickNewThisWeek([brandNew], NOW).map((a) => a.slug)).toEqual([
      'brand-new',
    ])
  })

  it('excludes apps with no createdAt', () => {
    expect(pickNewThisWeek([app('undated')], NOW)).toEqual([])
  })

  it('orders newest-added first and caps at 6', () => {
    const apps = [1, 2, 3, 4, 5, 6, 0].map((d) =>
      app(`a${d}`, { createdAt: daysAgo(d) }),
    )
    expect(pickNewThisWeek(apps, NOW).map((a) => a.slug)).toEqual([
      'a0',
      'a1',
      'a2',
      'a3',
      'a4',
      'a5',
    ])
  })
})
