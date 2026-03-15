/**
 * App Catalog Types - Universal Software Access Request Catalog
 *
 * These types define a standardized catalog of software applications and their
 * access methods. The typing system is designed to be universal across companies,
 * abstracting away specific tools (Jira, Slack, etc.) into generic categories.
 */

import type { AppAccessRequest, ApprovalMethod } from './approvalMethodTypes'

// ============================================================================
// APP CATALOG TYPES
// ============================================================================

/**
 * Source reference with metadata (used in API responses)
 * Note: parseDate is string (ISO-8601) when serialized from API, null when not yet parsed
 */
export interface SourceReference {
  sourceSlug: string
  url: string
  parseDate: string | null
}

/**
 * Application entry in the catalog
 */
export interface AppForCatalog {
  id: string
  slug: string
  displayName: string
  alias?: string // Optional short display name
  description?: string
  teams?: Array<string>
  accessRequest?: AppAccessRequest
  notes?: string
  tags?: Array<string>
  appUrl?: string
  links?: Array<{ url: string; title?: string }>
  iconName?: string // Optional icon identifier for display
  screenshotIds?: Array<string>
  sources?: Array<string> | Array<SourceReference> // String URLs from config OR enriched objects from database
  deprecated?: {
    /** Type of deprecation: 'deprecated' (fully deprecated) or 'discouraged' (use alternatives). Defaults to 'deprecated'. */
    type?: 'deprecated' | 'discouraged'
    /** Slug of the replacement app (optional) */
    replacementSlug?: string
    /** Deprecation message */
    comment: string
  }
}

// Derived catalog data returned by backend
export interface AppCategory {
  id: string
  name: string
}

export interface GroupingTagDefinition {
  prefix: string
  displayName: string
  description: string
  values: Array<GroupingTagValue>
}

type DistributiveOmit<T, TKey extends keyof any> = T extends any
  ? Omit<T, TKey>
  : never

export type AppApprovalMethod = DistributiveOmit<
  ApprovalMethod,
  'createdAt' | 'updatedAt'
>

export interface GroupingTagValue {
  value: string
  displayName: string
  description: string
}

export interface AppCatalogData {
  apps: Array<AppForCatalog>
  tagsDefinitions: Array<GroupingTagDefinition>
  approvalMethods: Array<AppApprovalMethod>
  appVersion?: { displayName: string; url?: string }
}
