/**
 * Internals the test kit mounts the app with. Reachable as
 * `@igstack/app-catalog-frontend-core/internal` — deliberately kept out of the
 * package's main entry so the public API stays the `App` component.
 *
 * No stability guarantees: this moves in lockstep with
 * `@igstack/app-catalog-test-kit`, which is its only intended consumer.
 */
export { App } from './App'
export type { AppProps } from './App'
export { AcDb, dbCacheDbKeys } from './userDb/AcDb'
export { createAcRouter } from './util/createAcRouter'
export {
  SEARCH_STORAGE_KEY,
  clearSessionState,
  seedSessionState,
} from './modules/appCatalog/hooks/useSessionSyncedState'
