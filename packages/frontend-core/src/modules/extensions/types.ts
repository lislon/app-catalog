import type { ReactNode } from 'react'

/**
 * The signed-in visitor as a plugin sees them.
 *
 * Structural on purpose. Core's own `User` (see `modules/auth/AuthContext.tsx`)
 * is not exported, and a plugin has no business depending on core's auth
 * internals: it needs an identity and an admin flag, nothing more. Widening this
 * is a deliberate API decision, not a convenience.
 */
export interface PluginUser {
  email?: string | null
  isAdmin: boolean
}

/**
 * A renderer whose props are deliberately unknowable.
 *
 * This exists only to break a type cycle: the context has to hold plugins, a
 * plugin's slot map is keyed by the composed `SlotSpec`, and `SlotSpec` is
 * composed from the feature files that call `slotFactory` — which would need the
 * context back. `never` in parameter position accepts every function regardless
 * of what it takes (parameters are contravariant under `strictFunctionTypes`), so
 * the registration stays assignable while the PUBLIC types in `index.ts` remain
 * exact. `makeSlot` re-narrows before calling.
 */
export type OpaqueRenderer = (props: never) => ReactNode

/**
 * What the context stores. Consumers never build this by hand — they build an
 * `AcPlugin` (see `index.ts`), which is assignable to it.
 */
export interface PluginRegistration {
  name: string
  slots?: Record<string, OpaqueRenderer | undefined>
  wrappers?: Record<string, OpaqueRenderer | undefined>
}

/**
 * Compile error naming any slot id two features both claim.
 *
 * `SlotSpec` is an intersection of the per-feature specs, and an intersection
 * accepts anything: two features declaring one id would silently intersect their
 * payloads into `A & B` — a slot nothing can satisfy. `extends` would error, but
 * only with a generic "incompatibly declared" message. This puts the offending
 * id in the error text.
 */
export type AssertDisjoint<TLeft, TRight> =
  Extract<keyof TLeft, keyof TRight> extends never
    ? true
    : { DUPLICATE_SLOT_ID: Extract<keyof TLeft, keyof TRight> }
