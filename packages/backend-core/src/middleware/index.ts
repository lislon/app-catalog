/**
 * Middleware module for app-catalog backend integration.
 *
 * Provides a batteries-included middleware factory that handles all backend wiring:
 * - Database connection management
 * - Authentication setup
 * - tRPC router configuration
 * - Feature registration (icons, assets, screenshots, admin chat)
 *
 * @example
 * ```typescript
 * const eh = await createAcMiddleware({
 *   basePath: '/api',
 *   database: { host, port, database, username, password, schema },
 *   auth: { baseURL, secret, providers },
 *   backend: myBackendImplementation,
 * })
 *
 * app.use(eh.router)
 * await eh.connect()
 * ```
 *
 * @module middleware
 */

// Main middleware factory
export { createAcMiddleware } from './createAcMiddleware'

// Types
export type {
  AcDatabaseConfig,
  AcAuthConfig,
  AcAdminChatConfig,
  AcFeatureToggles,
  AcBackendProvider,
  AcLifecycleHooks,
  AcMiddlewareOptions,
  AcMiddlewareResult,
  MiddlewareContext,
} from './types'

// Database manager (for advanced use cases)
export { AcDatabaseManager } from './database'

// HTML injection utilities
export { injectCustomScripts } from './htmlInjection'
