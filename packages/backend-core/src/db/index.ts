// Database connection
export {
  buildPgSchemaOptions,
  connectDb,
  createCorePrismaClient,
  disconnectDb,
  getDbClient,
  resolveDbSchema,
  setDbClient,
  verifyDbSchema,
} from './client'
export { buildPgSslConfig } from './sslConfig'

// Table sync utilities
export {
  tableSyncPrisma,
  type MakeTFromPrismaModel,
  type ObjectKeys,
  type ScalarFilter,
  type ScalarKeys,
  type TableSyncParamsPrisma,
} from './tableSyncPrismaAdapter'

export {
  TABLE_SYNC_MAGAZINE,
  type TableSyncMagazine,
  type TableSyncMagazineModelNameKey,
} from './tableSyncMagazine'

// App catalog sync
export { syncAppCatalog, type SyncAppCatalogResult } from './syncAppCatalog'
