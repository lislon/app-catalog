/**
 * Internals the test kit mounts the app with. Reachable as
 * `@igstack/app-catalog-frontend-core/internal` — deliberately kept out of the
 * package's main entry so the public API stays the `App` component.
 *
 * No stability guarantees: this moves in lockstep with
 * `@igstack/app-catalog-test-kit`, which is its only intended consumer.
 *
 * Must stay free of `createAcRouter`. The test kit runs inside a DEPLOYMENT's
 * test program, which declares its own `Register` augmentation for its own
 * route tree — and re-exporting `createAcRouter` here would drag the core's
 * competing augmentation in with it, which is a hard `TS2717`. The router
 * factory is injected instead; see `setRouterFactory` in the test kit. The
 * core's own router is published separately, at `/router`.
 */
export { App } from './App'
export type { AppProps } from './App'
export { AcDb, dbCacheDbKeys } from './userDb/AcDb'
export {
  SEARCH_STORAGE_KEY,
  clearSessionState,
  seedSessionState,
} from './modules/appCatalog/hooks/useSessionSyncedState'
