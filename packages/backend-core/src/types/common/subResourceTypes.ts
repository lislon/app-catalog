import type { AppAccessRequest } from './approvalMethodTypes'

/**
 * A sub-resource within an app.
 * Example: an AWS account under the "AWS Console" app.
 * @deprecated Use Resource with parentSlug instead. SubResource is kept for backward compatibility.
 */
export interface SubResource {
  slug: string
  displayName: string
  description?: string
  appSlug: string
  familySlug?: string
  tierSlug?: string
  aliases: string[]
  ownerPersonSlug?: string
  accessMaintainerGroupSlugs: string[]
  accessRequest?: AppAccessRequest
  accessComments?: string
  extra?: Record<string, unknown>
}
