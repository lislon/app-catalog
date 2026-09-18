import { describe, expect, it } from 'vitest'
import type {
  GroupingTagDefinition,
  Resource,
} from '@igstack/app-catalog-backend-core'
import {
  DAY_TO_DAY_AREA_KEY,
  DAY_TO_DAY_TAG,
  areaLabel,
  categoryOf,
  groupByArea,
} from '~/modules/appCatalog/utils/areaGrouping'

const app = (slug: string, tags: string[] = []) =>
  ({ slug, displayName: slug, tags }) as Resource

const definitions: GroupingTagDefinition[] = [
  {
    prefix: 'category',
    displayName: 'Category',
    description: '',
    values: [
      { value: 'finance', displayName: 'Money things', description: '' },
      { value: 'perks', displayName: 'Perks', description: '' },
    ],
  },
]

describe('categoryOf', () => {
  it('falls back to "other" without a category tag', () => {
    expect(categoryOf(app('a', ['universality:common']))).toBe('other')
  })
})

describe('groupByArea', () => {
  it('puts the day-to-day group first, then areas biggest-first', () => {
    const groups = groupByArea([
      app('f1', ['category:finance']),
      app('s1', ['category:security']),
      app('f2', ['category:finance']),
      app('shelved', ['category:security', DAY_TO_DAY_TAG]),
    ])
    expect(groups.map(([key, list]) => [key, list.length])).toEqual([
      [DAY_TO_DAY_AREA_KEY, 1],
      ['finance', 2],
      ['security', 2],
    ])
  })

  it('keeps a shelved app in its own category too', () => {
    const groups = groupByArea([
      app('chat', ['category:finance', DAY_TO_DAY_TAG]),
    ])
    expect(groups.map(([key, list]) => [key, list.map((a) => a.slug)])).toEqual(
      [
        [DAY_TO_DAY_AREA_KEY, ['chat']],
        ['finance', ['chat']],
      ],
    )
  })

  it('ignores a reach facet — only the placement tag shelves an app', () => {
    const groups = groupByArea([
      app('popular', ['category:finance', 'universality:everyone']),
    ])
    expect(groups.map(([key]) => key)).toEqual(['finance'])
  })

  it('omits the day-to-day group when nothing belongs there', () => {
    expect(groupByArea([app('bank', ['category:finance'])])).toEqual([
      ['finance', [expect.objectContaining({ slug: 'bank' })]],
    ])
  })
})

describe('areaLabel', () => {
  it('uses the catalog display name for a known category', () => {
    expect(areaLabel('finance', definitions)).toBe('Money things')
  })

  it('humanizes an unknown category slug', () => {
    expect(areaLabel('field_service', definitions)).toBe('Field service')
  })

  it('labels the day-to-day group, overridable', () => {
    expect(areaLabel(DAY_TO_DAY_AREA_KEY, definitions)).toBe('Day-to-day tools')
    expect(areaLabel(DAY_TO_DAY_AREA_KEY, definitions, 'Everyday')).toBe(
      'Everyday',
    )
  })

  it('works with no definitions at all', () => {
    expect(areaLabel('finance')).toBe('Finance')
  })
})
