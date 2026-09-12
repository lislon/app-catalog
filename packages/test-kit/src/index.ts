/**
 * Integration test harness for App Catalog.
 *
 * `given(...)` mounts the real `App` against a mock backend and mock network,
 * and hands back page objects (`ui.catalog`, `ui.app`, ...) to drive it with.
 * Consumers supply `vitest`, `jsdom` and the setup file:
 *
 *   // vite.config.ts
 *   test: {
 *     environment: 'jsdom',
 *     setupFiles: ['@igstack/app-catalog-test-kit/setup'],
 *   }
 */
export { given, cleanupTestResources } from './harness/given'
export type { GivenResult, UiTools } from './harness/given'
export { MockBackendVerifier } from './harness/MockBackendVerifier'

export { magazine } from './mock-backend/magazines'
export type { ConfigurerContext, Magazine } from './mock-backend/magazines'
export {
  MockBackendConfigurer,
  resetConfigurerCounter,
} from './mock-backend/MockBackendConfigurer'
export { MockDb } from './mock-backend/MockDb'
export { MockService } from './mock-backend/MockService'
export { MockUserContext } from './mock-backend/MockUserContext'
export type { UserConfig } from './mock-backend/MockUserContext'
export { BrowserStateCfg } from './mock-backend/BrowserStateCfg'

export { NetworkConfigurerCfg } from './mock-network/NetworkConfigurerCfg'
export type { NetworkOverrideFn } from './mock-network/NetworkConfigurerCfg'
export { NetworkCatalog } from './mock-network/NetworkCatalog'
export type { NetworkInterceptor } from './mock-network/NetworkCatalog'
export { SharedNetwork } from './mock-network/SharedNetwork'
export { makeNetworkReplyWithCatalog } from './mock-network/makeNetworkReplyWithCatalog'
export * from './mock-network/errorFactories'

export { CatalogTools } from './tools/CatalogTools'
export { AppDetailTools } from './tools/AppDetailTools'
export { GalleryTools } from './tools/GalleryTools'
export { getGlobalError } from './tools/ErrorTools'
export type { GlobalError } from './tools/ErrorTools'
export { browserState } from './tools/BrowserState'
export { suppressConsole, suppressConsoleGlobal } from './tools/suppressConsole'
