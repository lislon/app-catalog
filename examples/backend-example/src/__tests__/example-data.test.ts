import { describe, expect, it } from 'vitest'
import { exampleResources } from '../example-data.js'

describe('Example data integrity', () => {
  it('every resource has required fields', () => {
    for (const resource of exampleResources) {
      expect(resource.slug).toBeTruthy()
      expect(resource.displayName).toBeTruthy()
      expect(resource.id).toBeTruthy()
    }
  })

  it('claims use valid statuses', () => {
    const validStatuses = ['active', 'in-review', 'archived']
    const allClaims = exampleResources.flatMap((r) => r.claims ?? [])
    for (const claim of allClaims) {
      expect(validStatuses).toContain(claim.status)
      expect(claim.text).toBeTruthy()
      expect(claim.addedAt).toBeTruthy()
      const archived = claim.status === 'archived' ? [claim] : []
      for (const archivedClaim of archived) {
        expect(archivedClaim.archiveReason).toBeTruthy()
      }
    }
  })

  it('resource jumps have valid structure when present', () => {
    const allJumps = exampleResources.flatMap((r) => {
      const resource = r as { resourceJumps?: unknown[] }
      return resource.resourceJumps
        ? (resource.resourceJumps as { title?: unknown; url?: unknown }[])
        : []
    })
    for (const jump of allJumps) {
      expect(jump.title).toBeTruthy()
      expect(jump.url).toBeTruthy()
    }
  })
})
