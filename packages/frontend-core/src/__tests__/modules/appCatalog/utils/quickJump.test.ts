import type { QuickJump, Resource } from '@igstack/app-catalog-backend-core'
import { describe, expect, it } from 'vitest'

import {
  buildQuickJumpUrl,
  groupQuickJumps,
  quickJumpFieldName,
  quickJumpShortTitle,
  quickJumpSlug,
} from '~/modules/appCatalog/utils/quickJump'

const onHost: QuickJump = {
  identity: 'Case Id',
  title: 'View case',
  url: '{{baseHost}}/app/case?id={{value}}',
}
const absolute: QuickJump = {
  identity: 'Case Id',
  title: 'Search the event log',
  url: 'https://events.example.com/search?q={{value}}',
}

function resource(quickJumps: QuickJump[], appUrl?: string): Resource {
  return {
    id: 'r1',
    slug: 'app',
    displayName: 'App',
    description: '',
    appUrl,
    quickJumps,
  }
}

describe('buildQuickJumpUrl', () => {
  it("substitutes the resource's own host, without its trailing slash", () => {
    expect(buildQuickJumpUrl(onHost, '42', 'https://app.example.com/')).toBe(
      'https://app.example.com/app/case?id=42',
    )
  })

  it('drops a jump that needs a host the resource does not have', () => {
    expect(buildQuickJumpUrl(onHost, '42', undefined)).toBeNull()
    expect(buildQuickJumpUrl(absolute, '42', undefined)).toBe(
      'https://events.example.com/search?q=42',
    )
  })

  it('encodes the typed value exactly once', () => {
    // env-hopper ships %2540 in places — a genuine double-encode bug.
    expect(buildQuickJumpUrl(absolute, 'a b&c@d')).toBe(
      'https://events.example.com/search?q=a%20b%26c%40d',
    )
  })

  it('trims the typed value', () => {
    expect(buildQuickJumpUrl(absolute, '  42\n')).toBe(
      'https://events.example.com/search?q=42',
    )
  })
})

describe('groupQuickJumps', () => {
  it('groups by identity in first-appearance order and drops unbuildable jumps', () => {
    const app = resource([
      absolute,
      { ...onHost, identity: 'Clinic Id' },
      { ...absolute, title: 'Second case link' },
    ])

    expect(groupQuickJumps(app)).toEqual([
      {
        identity: 'Case Id',
        jumps: [absolute, { ...absolute, title: 'Second case link' }],
      },
    ])
  })
})

describe('quickJumpFieldName', () => {
  it('derives one stable autofill key per identity label', () => {
    expect(quickJumpFieldName('Case Id')).toBe('qj-case-id')
    expect(quickJumpFieldName('Sequencing Sample Id')).toBe(
      'qj-sequencing-sample-id',
    )
  })
})

describe('quickJumpSlug', () => {
  it('splits the sub-system off the action, one dot between them', () => {
    expect(
      quickJumpSlug({ ...onHost, title: 'Tracker \u2014 View case' }),
    ).toBe('tracker.view-case')
  })

  it('leaves a title with no sub-system as a single segment', () => {
    expect(quickJumpSlug(onHost)).toBe('view-case')
  })

  it('keeps url-safe characters only', () => {
    expect(
      quickJumpSlug({
        ...onHost,
        title: 'Kafka UI \u2014 id/aggregate record!',
      }),
    ).toBe('kafka-ui.id-aggregate-record')
  })
})

describe('quickJumpShortTitle', () => {
  it('drops the system prefix the menu shows', () => {
    expect(
      quickJumpShortTitle({
        ...onHost,
        title: 'Tracker \u2014 Rerun report',
      }),
    ).toBe('Rerun report')
  })

  it('leaves a title that has no prefix alone', () => {
    expect(quickJumpShortTitle(onHost)).toBe('View case')
  })

  it('keeps a dash that is part of the name, not a separator', () => {
    expect(
      quickJumpShortTitle({ ...onHost, title: 'multi-part-name record' }),
    ).toBe('multi-part-name record')
  })
})
