import type { ReactNode } from 'react'
import type {
  ResourceDetailSlots,
  ResourceDetailWrappers,
} from './features/resourceDetail'
import type { AssertDisjoint } from './types'

export { ExtensionsContext, useExtensions } from './ExtensionsContext'
export { slotFactory, wrapperFactory } from './factories'
export { makeSlot, makeWrapper } from './makeSlot'
export type { PluginUser, PluginRegistration } from './types'
export type { AssertDisjoint } from './types'
export {
  ResourceDetailAccessActions,
  ResourceDetailProvider,
} from './features/resourceDetail'
export type {
  ResourceDetailSlots,
  ResourceDetailWrappers,
} from './features/resourceDetail'

/**
 * Every leaf slot in the core, composed from the per-feature specs.
 *
 * Adding a feature means a new `features/<name>.ts` plus one member here and one
 * line in the guard below. No existing feature file is touched.
 */
export type SlotSpec = ResourceDetailSlots

/** Every wrapper slot in the core. */
export type WrapperSpec = ResourceDetailWrappers

// Guard: with a second feature this becomes
// `AssertDisjoint<ResourceDetailSlots, ServiceDeskSlots>` and fails with the
// duplicated id spelled out in the error. With one feature it is trivially true,
// and is kept so the next feature inherits the check rather than inventing it.
const _slotIdsAreDisjoint: AssertDisjoint<SlotSpec, Record<never, never>> = true
void _slotIdsAreDisjoint

/**
 * A plugin's leaf-slot handlers. Each receives exactly its slot's payload.
 *
 * Registering an unknown slot, or reading a field the slot does not pass, is a
 * compile error — which is the whole point of composing `SlotSpec` rather than
 * typing handlers as `(props: unknown)`.
 */
export type PluginSlots = {
  [N in keyof SlotSpec]?: (props: SlotSpec[N]) => ReactNode
}

/** A plugin's wrapper handlers. `children` is injected by the core. */
export type PluginWrappers = {
  [N in keyof WrapperSpec]?: (
    props: WrapperSpec[N] & { children: ReactNode },
  ) => ReactNode
}

/**
 * One deployment-specific feature's contribution to the core's UI.
 *
 * Passed to `<App extensions={[...]} />` as an array, not a keyed map: a map
 * holds one value per key, so a second plugin at the same slot would silently
 * replace the first and two wrappers around one subtree would be impossible.
 *
 * The array must be a module-level constant. The core iterates it in render
 * order, so rebuilding it per render would change hook call order inside the
 * plugins and violate the rules of hooks.
 */
export interface AcPlugin {
  /** Identity, used in error reports and test assertions. */
  name: string
  slots?: PluginSlots
  wrappers?: PluginWrappers
}
