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
  /**
   * Displayed approval method
   */
  displayName: string
  /**
   * Optionally - older name of approval method if there were migration in organization.
   */
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
  /**
   * User-friendly role name.
   */
  displayName: string
  /**
   * Description of role.
   */
  description?: string
  /**
   * Notes for admins/approvers (Not for requestores)
   */
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
 * Used to store ONLY instructions related to access request
 */
export interface AppAccessRequest {
  /**
   * Method of asking for access.
   */
  approvalMethodSlug: string // FK to DbApprovalMethod

  /**
   * Additional comments, if no other fields are fit.
   */
  comments?: string
  /**
   * A template to put into a request ask.
   */
  requestPrompt?: string
  /**
   * Recommended steps post approvel to get access to specific resources.
   */
  postApprovalInstructions?: string

  /**
   * Available roles for given resource.
   */
  roles?: AppRole[]

  /**
   * Individuals that will approve request within given approval method. No need to reach them directly unless specified.
   */
  approverPersonSlugs?: string[] // slugs referencing Person entities
  /**
   * Additional instructions to get approvals
   */
  urls?: ApprovalUrl[]
}

/** @deprecated Use AppAccessRequest instead (same type, new canonical name) */
export type AccessRequest = AppAccessRequest

/** @deprecated Use AppRole instead (same type, new canonical name) */
export type Role = AppRole
