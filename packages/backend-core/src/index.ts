// common

export { createTrpcRouter } from './server/controller'
export type { TRPCRouter } from './server/controller'
export { createAcTrpcContext } from './server/acTrpcContext'
export type {
  AcTrpcContext,
  AcTrpcContextOptions,
} from './server/acTrpcContext'

export { staticControllerContract } from './server/acStaticControllerContract'
export type { AcStaticControllerContract } from './server/acStaticControllerContract'

// ui-only

// backend-only

export type { AppForCatalog } from './types/common/appCatalogTypes'
export * from './types/index'

// Auth
export { createAuth, type BetterAuth } from './modules/auth/auth'

export { registerAuthRoutes } from './modules/auth/registerAuthRoutes'

export { createAuthRouter, type AuthRouter } from './modules/auth/authRouter'

// Icon management
export {
  registerIconRestController,
  type IconRestControllerConfig,
} from './modules/icons/iconRestController'

export {
  getAssetByName,
  upsertIcon,
  upsertIcons,
  type UpsertIconInput,
} from './modules/icons/iconService'

// Asset management (universal for icons, screenshots, etc.)
export {
  registerAssetRestController,
  type AssetRestControllerConfig,
} from './modules/assets/assetRestController'

export {
  registerScreenshotRestController,
  type ScreenshotRestControllerConfig,
} from './modules/assets/screenshotRestController'

export { syncAssets, type SyncAssetsConfig } from './modules/assets/syncAssets'

// App Catalog utilities
export {
  checkAllLinks,
  printLinkCheckReport,
} from './modules/appCatalog/checkLinks'

// Database utilities
export {
  connectDb,
  disconnectDb,
  getDbClient,
  setDbClient,
  syncAppCatalog,
  TABLE_SYNC_MAGAZINE,
  tableSyncPrisma,
  type MakeTFromPrismaModel,
  type ObjectKeys,
  type ScalarFilter,
  type ScalarKeys,
  type SyncAppCatalogResult,
  type TableSyncMagazine,
  type TableSyncMagazineModelNameKey,
  type TableSyncParamsPrisma,
} from './db'

// Middleware (batteries-included backend setup)
export {
  createAcMiddleware,
  AcDatabaseManager,
  injectCustomScripts,
  type AcDatabaseConfig,
  type AcAuthConfig,
  type AcFeatureToggles,
  type AcBackendProvider,
  type AcLifecycleHooks,
  type AcMiddlewareOptions,
  type AcMiddlewareResult,
  type MiddlewareContext,
} from './middleware'

// Lighthouse Keeper (agentic AI debugging tool)
export { runLighthouseKeeperDemo } from './modules/lighthouseKeeper/demo.js'
export {
  createAppCatalogAITools,
  APP_CATALOG_AI_SYSTEM_PROMPT,
} from './modules/lighthouseKeeper/tools.js'
export type {
  AcLighthouseKeeperConfig,
  AcMcpServerConfig,
} from './middleware/types.js'
