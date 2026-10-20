import { describe, expect, it } from 'vitest'
import { rowToResource } from '../modules/appCatalog/service'

// Only the columns rowToResource reads unconditionally; everything else is null.
function row(claims: unknown) {
  return {
    id: 'example-app',
    slug: 'example-app',
    type: 'application',
    displayName: 'Example App',
    description: 'Does things.',
    nicknames: [],
    teams: [],
    tags: [],
    screenshotIds: [],
    urlIssues: [],
    aliases: [],
    approverSlugs: [],
    sourceRefs: [],
    createdAt: new Date('2026-01-01'),
    claims,
  } as unknown as Parameters<typeof rowToResource>[0]
}

describe('rowToResource — claims', () => {
  it('passes stored claims through unchanged', () => {
    const claims = [
      {
        text: 'Lead approves access.',
        addedAt: '2026-10-12',
        origin: 'feedback:abc',
        status: 'active',
      },
      {
        text: 'No mobile app.',
        addedAt: '2026-08-03',
        status: 'archived',
        archiveReason: 'superseded by https://example.com',
        archivedAt: '2026-10-02',
      },
    ]
    expect(rowToResource(row(claims)).claims).toEqual(claims)
  })

  it('omits claims when the column is null', () => {
    expect(rowToResource(row(null)).claims).toBeUndefined()
  })
})
