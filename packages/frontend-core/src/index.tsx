export { appPropsFactory } from './appPropsFactory.js'
export type { AppPropsFactoryOptions } from './appPropsFactory.js'
// What a deployment's own router factory is handed. Safe on this entry: it
// names no route tree, so it carries no `declare module` with it.
export type { AcRouterContext, AcRouterInitParams } from './types/types'
export { App } from './App'
export type { AppProps } from './App'
export type { AreaIcon, AreasSettings, UiSettings } from './types/uiSettings'
export {
  DAY_TO_DAY_AREA_KEY,
  DAY_TO_DAY_TAG,
} from './modules/appCatalog/utils/areaGrouping'
export { PwaAutoUpdateProvider, usePwaAutoUpdate } from './modules/pwa/index'
export type { PwaAutoUpdateOptions, PwaUpdateHandle } from './modules/pwa/index'

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
} from './modules/extensions/index'
export type { Resource } from '@igstack/app-catalog-backend-core'
