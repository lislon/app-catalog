/**
 * Approval Method Types
 *
 * Global approval method templates that apps can link to.
 * Each method has a type (service, custom, noAccessRequired, unknown) with type-specific config.
 */

// ============================================================================
// APPROVAL METHOD TYPES (Global Templates)
// ============================================================================

export type ApprovalMethodType =
  | 'service'
  | 'personTeam'
  | 'custom'
  | 'noAccessRequired'
  | 'unknown'

/**
 * Service type config - for bots, ticketing systems, self-service portals
 */
export interface ServiceConfig {
  url?: string // Service URL (clickable in UI)
  icon?: string // Icon identifier
}

/**
 * PersonTeam type config - for person/group-based approval
 */
export interface PersonTeamConfig {
  personSlugs?: string[] // Person references
  groupSlugs?: string[] // Group references
}

/**
 * Custom type config - generic, no additional fields
 */
export interface CustomConfig {
  // No additional fields
}

/**
 * Union of all config types
 */
export type ApprovalMethodConfig =
  | ServiceConfig
  | PersonTeamConfig
  | CustomConfig

/**
 * Approval Method - stored in DbApprovalMethod
 */
export type ApprovalMethod = {
  slug: string
  displayName: string
  /** Old/migrated URLs that map to this approval method (e.g., jira.natera.com -> natera.atlassian.net) */
  deprecatedAliases?: string[]
  createdAt?: Date
  updatedAt?: Date
} & (
  | {
      type: 'service'
      config: ServiceConfig
    }
  | {
      type: 'personTeam'
      config: PersonTeamConfig
    }
  | {
      type: 'custom'
      config: CustomConfig
    }
  | {
      type: 'noAccessRequired'
      config: CustomConfig
    }
  | {
      type: 'unknown'
      config: CustomConfig
    }
)

// ============================================================================
// PER-APP APPROVAL DETAILS
// ============================================================================

/**
 * Role that can be requested for an app
 */
export interface AppRole {
  displayName: string
  description?: string
  adminNotes?: string
}

/**
 * URL link with optional label
 */
export interface ApprovalUrl {
  label?: string
  url: string
}

/**
 * Per-app approval details - stored as JSON in DbAppForCatalog
 * All comment/text-like strings are markdown
 */
export interface AppAccessRequest {
  approvalMethodSlug: string // FK to DbApprovalMethod

  // Common fields (all types) - markdown text
  comments?: string
  requestPrompt?: string
  postApprovalInstructions?: string

  // Lists
  roles?: AppRole[]
  approverPersonSlugs?: string[] // slugs referencing Person entities
  urls?: ApprovalUrl[]
}

// ============================================================================
// INPUT TYPES FOR API
// ============================================================================

export interface CreateApprovalMethodInput {
  type: ApprovalMethodType
  displayName: string
  config?: ApprovalMethodConfig
}

export interface UpdateApprovalMethodInput {
  id: string
  type?: ApprovalMethodType
  displayName?: string
  config?: ApprovalMethodConfig
}
