import { describe, expect, it } from 'vitest'
import type { Resource } from '@igstack/app-catalog-backend-core'
import {
  getAccessPrerequisiteChain,
  getParentResource,
} from '~/modules/appCatalog/utils/resolveHelpers'

const r = (over: Partial<Resource> & { slug: string }): Resource =>
  ({ id: over.slug, displayName: over.slug, ...over }) as Resource

describe('getParentResource', () => {
  it('returns undefined for a root resource', () => {
    const root = r({ slug: 'aws-console' })
    expect(getParentResource([root], root)).toBeUndefined()
  })

  it('finds the immediate parent by slug', () => {
    const parent = r({ slug: 'aws-console' })
    const child = r({ slug: 'acct-prod', parentSlug: 'aws-console' })
    expect(getParentResource([parent, child], child)?.slug).toBe('aws-console')
  })
})

describe('getAccessPrerequisiteChain (#38 two-step access)', () => {
  it('is empty for a root resource', () => {
    const root = r({
      slug: 'gitlab',
      accessRequest: { approvalMethodSlug: 'x' },
    })
    expect(getAccessPrerequisiteChain([root], root)).toEqual([])
  })

  it('is empty when the parent has NO access policy (nothing to require first)', () => {
    const parent = r({ slug: 'aws-console' }) // no accessRequest
    const child = r({ slug: 'acct', parentSlug: 'aws-console' })
    expect(getAccessPrerequisiteChain([parent, child], child)).toEqual([])
  })

  it('returns the access-bearing parent for a nested resource', () => {
    const parent = r({
      slug: 'aws-console',
      accessRequest: { approvalMethodSlug: 'it-helpdesk' },
    })
    const child = r({ slug: 'acct-prod', parentSlug: 'aws-console' })
    const chain = getAccessPrerequisiteChain([parent, child], child)
    expect(chain.map((c) => c.slug)).toEqual(['aws-console'])
  })

  it('orders multi-level chains root → nearest parent', () => {
    const root = r({
      slug: 'cloud',
      accessRequest: { approvalMethodSlug: 'a' },
    })
    const mid = r({
      slug: 'aws-console',
      parentSlug: 'cloud',
      accessRequest: { approvalMethodSlug: 'b' },
    })
    const leaf = r({ slug: 'acct', parentSlug: 'aws-console' })
    const chain = getAccessPrerequisiteChain([root, mid, leaf], leaf)
    expect(chain.map((c) => c.slug)).toEqual(['cloud', 'aws-console'])
  })

  it('does not loop on a cyclic parent reference', () => {
    const a = r({
      slug: 'a',
      parentSlug: 'b',
      accessRequest: { approvalMethodSlug: 'x' },
    })
    const b = r({
      slug: 'b',
      parentSlug: 'a',
      accessRequest: { approvalMethodSlug: 'y' },
    })
    // must terminate
    const chain = getAccessPrerequisiteChain([a, b], a)
    expect(chain.length).toBeLessThanOrEqual(2)
  })
})
