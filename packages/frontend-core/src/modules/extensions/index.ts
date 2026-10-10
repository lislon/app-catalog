import { useMemo } from 'react'
import type { ReactNode } from 'react'
// Relative, not `~`: this file is on the published entry's graph and therefore
// in every consumer's program, and `~` is the CORE's alias — a consumer only
// resolves it if it has mapped it, which the example app has not.
import { useOptionalUser } from '../auth/AuthContext'
import type {
  ResourceDetailSlots,
  ResourceDetailWrappers,
} from './features/resourceDetail'
import type { AssertDisjoint, PluginUser } from './types'

import { useExtensions } from './ExtensionsContext'

export { ExtensionsContext, useExtensions } from './ExtensionsContext'
export { slotFactory, wrapperFactory } from './factories'
export { makeSlot, makeWrapper } from './makeSlot'
export type { PluginUser, PluginRegistration } from './types'
export type { AssertDisjoint } from './types'
export {
  ResourceDetailAccessActions,
  ResourceSubResourceRowActions,
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

/**
 * Whether any registered plugin fills this slot.
 *
 * For the cases where rendering the slot is not enough and the core has to
 * change its own layout around it — a table column, say, which would otherwise
 * be an empty column with a header and no cells in every build that registers
 * nothing. Rendering an empty slot costs nothing; reserving space for one is
 * what this is for.
 *
 * Use it ONLY for layout. A slot must never be the only route to something the
 * core itself needs, so branching behaviour on a plugin's presence is a design
 * smell even where branching layout is not.
 */
export function useSlotFilled(slot: keyof SlotSpec): boolean {
  return useExtensions().some((plugin) => Boolean(plugin.slots?.[slot]))
}

/**
 * The signed-in user, reduced to what slots are given.
 *
 * One place, so two slots cannot disagree about the shape — and deliberately a
 * projection rather than the real user object: the core's `User` is free to grow
 * fields, and handing a plugin the whole thing would make every one of them part
 * of the published slot contract.
 *
 * Returns `null` with no `AuthProvider` above it. The detail card renders inside
 * the catalog panel, which some suites mount outside the provider, and throwing
 * there would make a plugin's presence break unrelated tests.
 */
export function usePluginUser(): PluginUser | null {
  const user = useOptionalUser()
  return useMemo(
    // `?? false`, because admin is a capability: absent must read as "not an
    // admin", never as undefined leaking into a plugin's own check.
    () => (user ? { email: user.email, isAdmin: user.isAdmin ?? false } : null),
    [user],
  )
}
