import type { Request, Router } from 'express'
import type { LanguageModel, Tool } from 'ai'
import type { BetterAuthOptions } from 'better-auth'
import type { Session, User } from 'better-auth/types'
import type { AppCatalogCompanySpecificBackend } from '../types/backend/companySpecificBackend'
import type { BetterAuth } from '../modules/auth/auth'
import type { TRPCRouter } from '../server/controller'

/**
 * Database connection configuration.
 * Supports both connection URL and structured config.
 */
export type AcDatabaseConfig =
  | { url: string }
  | {
      host: string
      port: number
      database: string
      username: string
      password: string
      schema?: string
    }

/**
 * Mock user configuration for development/testing.
 * When provided, bypasses authentication and injects this user into all requests.
 * Dev mock user is always treated as admin.
 */
export interface AcDevMockUser {
  /** User ID */
  id: string
  /** User email */
  email: string
  /** User display name */
  name: string
}

/**
 * Auth configuration for Better Auth integration.
 */
export interface AcAuthConfig {
  /** Full better-auth options — deployment controls everything */
  betterAuthOptions: BetterAuthOptions
  /** Dev bypass */
  devMockUser?: AcDevMockUser
  /** Deployment decides who is admin. If not provided, nobody is admin. */
  isAdmin?: (
    user: User,
    session: Session,
    ctx: { request: Request; auth: BetterAuth },
  ) => boolean | Promise<boolean>
}

/**
 * Admin chat (AI) configuration.
 * When provided, enables the admin/chat endpoint.
 */
export interface AcAdminChatConfig {
  /** AI model instance from @ai-sdk/* packages */
  model: LanguageModel
  /** System prompt for the AI assistant */
  systemPrompt?: string
  /** Custom tools available to the AI */
  tools?: Record<string, Tool>
  /** Validation function called before each request */
  validateConfig?: () => void
}

/**
 * MCP server configuration for Lighthouse Keeper.
 */
export interface AcMcpServerConfig {
  name: string
  url: string
  headers?: Record<string, string>
}

/**
 * Lighthouse Keeper (agentic AI debugging tool) configuration.
 */
export interface AcLighthouseKeeperConfig {
  /** AI model instance from @ai-sdk/* packages */
  model: LanguageModel
  /** MCP servers to make available as tools */
  mcpServers: Array<AcMcpServerConfig>
  /** System prompt for the lighthouse keeper AI (optional; deployment can provide its own) */
  systemPrompt?: string
}

/**
 * Feature toggles for enabling/disabling specific functionality.
 *
 * Note: Icons, assets, screenshots, and catalog backup are always enabled.
 * Only these optional features can be toggled:
 */
export interface AcFeatureToggles {
  /** Enable tRPC endpoints (default: true) */
  trpc?: boolean
  /** Enable auth endpoints (default: true) */
  auth?: boolean
  /** Enable admin chat endpoint (default: true if adminChat config provided) */
  adminChat?: boolean
}

/**
 * Company-specific backend can be provided as:
 * 1. Direct object implementing the interface
 * 2. Factory function called per-request (for DI integration)
 * 3. Async factory function
 */
export type AcBackendProvider =
  | AppCatalogCompanySpecificBackend
  | (() => AppCatalogCompanySpecificBackend)
  | (() => Promise<AppCatalogCompanySpecificBackend>)

/**
 * Lifecycle hooks for database and middleware events.
 */
export interface AcLifecycleHooks {
  /** Called after database connection is established */
  onDatabaseConnected?: () => void | Promise<void>
  /** Called before database disconnection (for cleanup) */
  onDatabaseDisconnecting?: () => void | Promise<void>
  /** Called after all routes are registered - use to add custom routes */
  onRoutesRegistered?: (router: Router) => void | Promise<void>
  /** Custom error handler for middleware errors */
  onError?: (error: Error, context: { path: string }) => void
}

/**
 * Main configuration options for the app-catalog middleware.
 */
export interface AcMiddlewareOptions {
  /**
   * Base path prefix for all routes (default: '/api')
   * - tRPC: {basePath}/trpc
   * - Auth: {basePath}/auth (note: auth basePath is hardcoded, this affects where router mounts)
   * - Icons: {basePath}/icons
   * - Assets: {basePath}/assets
   * - Screenshots: {basePath}/screenshots
   * - Admin Chat: {basePath}/admin/chat
   */
  basePath?: string

  /**
   * Database connection configuration (required).
   * Backend-core manages the database for all features.
   */
  database: AcDatabaseConfig

  /** Auth configuration (required) */
  auth: AcAuthConfig

  /** Company-specific backend implementation (required) */
  backend: AcBackendProvider

  /** AI admin chat configuration (optional) */
  adminChat?: AcAdminChatConfig

  /** Feature toggles (all enabled by default) */
  features?: AcFeatureToggles

  /** Lifecycle hooks */
  hooks?: AcLifecycleHooks

  /**
   * Custom script URLs to inject at the end of the HTML body.
   * Useful for analytics, monitoring, or other third-party scripts.
   *
   * @example
   * customScripts: ['/assets-static/analytics/analytics.js']
   */
  customScripts?: Array<string>
}

/**
 * Result of middleware initialization.
 *
 * @example
 * ```typescript
 * const eh = await createAcMiddleware({ ... })
 *
 * // Mount routes
 * app.use(eh.router)
 *
 * // Connect to database
 * await eh.connect()
 *
 * // Cleanup on shutdown
 * process.on('SIGTERM', async () => {
 *   await eh.disconnect()
 * })
 * ```
 */
export interface AcMiddlewareResult {
  /** Express router with all app-catalog routes */
  router: Router
  /** Better Auth instance (for extending auth functionality) */
  auth: BetterAuth
  /** tRPC router (for extending with custom procedures) */
  trpcRouter: TRPCRouter
  /** Connect to database (call during app startup) */
  connect: () => Promise<void>
  /** Disconnect from database (call during app shutdown) */
  disconnect: () => Promise<void>
  /** Add custom routes to the middleware router */
  addRoutes: (callback: (router: Router) => void) => void
}

/**
 * Internal context passed to feature registration functions.
 */
export interface MiddlewareContext {
  auth: BetterAuth
  trpcRouter: TRPCRouter
  createContext: () => Promise<{
    companySpecificBackend: AppCatalogCompanySpecificBackend
  }>
  isAdmin?: AcAuthConfig['isAdmin']
}
