/**
 * App Catalog Types - Universal Software Access Request Catalog
 *
 * These types define a standardized catalog of software applications and their
 * access methods. The typing system is designed to be universal across companies,
 * abstracting away specific tools (Jira, Slack, etc.) into generic categories.
 */

import type { AppAccessRequest, ApprovalMethod } from './approvalMethodTypes'
import type { Group, Person } from './personGroupTypes'

// ============================================================================
// TIER VARIANT
// ============================================================================

/**
 * A tier variant of a resource (e.g., prod/dev environments).
 * Each tier can have its own URL and access process.
 */
export interface TierVariant {
  tierSlug: string
  displayName?: string
  description?: string
  appUrl?: string
  accessRequest?: AppAccessRequest
}

/** @deprecated Use TierVariant instead */
export type AppTierVariant = TierVariant

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
 * Resource entry in the catalog (application or sub-resource).
 * Unified model: applications have no parentSlug; sub-resources have parentSlug.
 */
export interface Resource {
  id: string
  slug: string
  /** Discriminator: "application" for top-level apps, "sub-resource" for children, etc. */
  type?: string
  displayName: string
  abbreviation?: string // Optional short abbreviation (e.g. K8s, ECR, LV)
  nicknames?: string[] // Alternative names / AKA
  description?: string
  teams?: string[]
  accessRequest?: AppAccessRequest
  notes?: string
  tags?: string[]
  appUrl?: string
  links?: { url: string; title?: string }[]
  iconName?: string // Optional icon identifier for display
  screenshotIds?: string[]
  sources?: string[] | SourceReference[] // String URLs from config OR enriched objects from database
  deprecated?: {
    /** Type of deprecation: 'deprecated' (fully deprecated) or 'discouraged' (use alternatives). Defaults to 'deprecated'. */
    type?: 'deprecated' | 'discouraged'
    /** Slug of the replacement app (optional) */
    replacementSlug?: string
    /** Deprecation message */
    comment: string
  }
  /** Agent-facing prompt guiding how to maintain this app's data */
  aiPrompt?: string
  /** URL health issues detected by automated scanning */
  urlIssues?: string[]
  /** Optional tier variants (e.g., prod/dev) with per-tier URLs and access */
  tiers?: TierVariant[]

  // --- Fields merged from former SubResource ---
  /** Slug of parent resource (undefined for top-level applications) */
  parentSlug?: string
  /** Tier slug (e.g. "prod", "dev") — for sub-resources */
  tier?: string
  /** Groups tier variants visually */
  familySlug?: string
  /** Alternative identifiers */
  aliases?: string[]
  /** Person slug of the owner */
  ownerPersonSlug?: string
  /** Group slugs of access maintainers */
  accessMaintainerGroupSlugs?: string[]
  /** Free-text access comments */
  accessComments?: string
  /** Arbitrary extra data */
  extra?: Record<string, unknown>
}

/** @deprecated Use Resource instead */
export type AppForCatalog = Resource

// Derived catalog data returned by backend
export interface AppCategory {
  id: string
  name: string
}

export interface GroupingTagDefinition {
  prefix: string
  displayName: string
  description: string
  values: GroupingTagValue[]
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

export interface VersionInfo {
  displayName: string
  url?: string
}

export interface AppVersionInfo {
  backend?: VersionInfo
  frontend?: VersionInfo
  coreVersion?: VersionInfo
}

export interface AppCatalogData {
  resources: Resource[]
  /** @deprecated Use resources instead */
  apps?: Resource[]
  tagsDefinitions: GroupingTagDefinition[]
  approvalMethods: AppApprovalMethod[]
  persons: Person[]
  groups: Group[]
  versions?: AppVersionInfo
}
