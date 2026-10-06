export { appPropsFactory } from './appPropsFactory.js'
export { App } from './App'
export type { AppProps } from './App'
export type { AreaIcon, AreasSettings, UiSettings } from './types/uiSettings'
export {
  DAY_TO_DAY_AREA_KEY,
  DAY_TO_DAY_TAG,
} from './modules/appCatalog/utils/areaGrouping'
export { PwaAutoUpdateProvider, usePwaAutoUpdate } from './modules/pwa'
export type { PwaAutoUpdateOptions, PwaUpdateHandle } from './modules/pwa'

// ── Plugins ───────────────────────────────────────────────────────────────────
// A deployment registers these via <App extensions={[...]} />. `Resource` is
// re-exported because the slot payloads name it: without that, a consumer would
// have to depend on backend-core directly just to type a handler.
export type {
  AcPlugin,
  PluginSlots,
  PluginWrappers,
  PluginUser,
  SlotSpec,
  WrapperSpec,
} from './modules/extensions'
export type { Resource } from '@igstack/app-catalog-backend-core'
