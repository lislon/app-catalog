import { createContext, use } from 'react'
import type { ReactNode } from 'react'
import type { PluginRegistration } from './types'

const ExtensionsInternalContext = createContext<
  readonly PluginRegistration[] | undefined
>(undefined)

interface ExtensionsContextProps {
  children: ReactNode
  value?: readonly PluginRegistration[]
}

export function ExtensionsContext({ children, value }: ExtensionsContextProps) {
  return (
    <ExtensionsInternalContext value={value}>
      {children}
    </ExtensionsInternalContext>
  )
}

/**
 * Registered plugins, or an empty list.
 *
 * Empty is the open-source default and has to stay a first-class state: every
 * slot renders nothing and every wrapper passes its children through, so the UI
 * is identical to one with no slots at all. Slots are additive — a slot must
 * never be the only route to something the core itself needs.
 */
export function useExtensions(): readonly PluginRegistration[] {
  return use(ExtensionsInternalContext) ?? EMPTY
}

// Module-level constant: a fresh `[]` per call would be a new identity every
// render and defeat memoisation in anything downstream of it.
const EMPTY: readonly PluginRegistration[] = []
