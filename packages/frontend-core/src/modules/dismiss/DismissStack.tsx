import { createContext, use, useEffect, useMemo, useRef } from 'react'

/**
 * One Escape key, one answer: dismiss whatever opened last.
 *
 * Before this existed, Escape was handled in six independent places, and each
 * one had to know about the others to avoid double-firing — the detail card
 * bound Escape only `enabled: !isGalleryOpen`, the gallery installed its own
 * capture-phase listener specifically to beat Radix to the event, and the
 * screenshot dialog cancelled Radix's own Escape by reading the gallery's
 * fullscreen state through a ref. Every new overlay had to learn that dance,
 * and getting it wrong stayed invisible until someone pressed Escape in the
 * wrong order. It was wrong: a dialog opened over the card had no say, so
 * Escape closed the card out from under it and navigated away.
 *
 * The replacement is a last-in-first-out stack. A layer says "I am
 * dismissable"; the stack decides who Escape belongs to, which is always the
 * layer registered most recently and still enabled. No layer needs to know
 * another exists.
 *
 * Mount order IS stack order, and that is the useful meaning of "previous":
 * the thing you opened last is the thing Escape takes away. For a route-backed
 * overlay that is also a step back, because its dismiss callback navigates.
 *
 * `useDismissable` works with or without a provider above it, on purpose. A
 * hook that silently did nothing outside a provider would be the same class of
 * bug this module exists to delete — every render site, including tests and
 * stories, would have to remember a wrapper, and forgetting it would look like
 * working code with dead Escape handling. So an app-wide stack is the default
 * and `DismissStackProvider` is only for scoping.
 */

interface DismissEntry {
  /** Called when Escape belongs to this layer. */
  onDismiss: () => void
  /**
   * A layer can stay registered and opt out — a collapsed panel, a closed
   * popover. Skipped when choosing the top rather than unregistering, so a
   * layer that toggles does not keep reshuffling the stack.
   */
  enabled: boolean
}

export interface DismissStackApi {
  /** Pushes an entry and returns its unregister function. */
  register: (entry: DismissEntry) => () => void
  /**
   * Dismisses the topmost enabled layer; reports whether there was one.
   * Exposed for a component with its own key handling that still wants stack
   * ordering instead of inventing its own.
   */
  dismissTop: () => boolean
}

/**
 * The listener is installed while at least one layer is registered and removed
 * when the last one leaves, so an app with nothing open has no global key
 * handler at all.
 */
function createStack(): DismissStackApi {
  const entries: DismissEntry[] = []

  const dismissTop = () => {
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i]
      // Indexed access is `T | undefined` under the strict flag, and an
      // unregister during iteration could make that real.
      if (!entry?.enabled) continue
      entry.onDismiss()
      return true
    }
    return false
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return
    // Something closer to the event already dealt with it — a text field
    // cancelling an edit, say. Honoured rather than overridden: the element the
    // user is typing in is more specific than any layer containing it.
    //
    // This check is the reason the listener below is on the BUBBLE phase. In
    // capture it would run before every component handler, so `defaultPrevented`
    // would always be false and a field could never keep Escape for itself —
    // pressing Escape while renaming something would close the card instead of
    // cancelling the rename.
    if (event.defaultPrevented) return
    if (!dismissTop()) return
    // Claim it, so a handler further out does not also act.
    event.preventDefault()
    event.stopPropagation()
  }

  const register = (entry: DismissEntry) => {
    if (entries.length === 0) {
      // Bubble, on the document: every component handler and React's own
      // delegated handlers run first, so the innermost thing that wants Escape
      // gets it. Radix is the one exception — it listens with `capture: true`,
      // so it runs BEFORE this. `DialogContent` bridges that by asking the
      // stack from inside Radix's own escape callback.
      document.addEventListener('keydown', onKeyDown)
    }
    entries.push(entry)
    return () => {
      const i = entries.indexOf(entry)
      if (i !== -1) entries.splice(i, 1)
      if (entries.length === 0) {
        document.removeEventListener('keydown', onKeyDown)
      }
    }
  }

  return { register, dismissTop }
}

/**
 * The app-wide stack, used whenever no provider scopes one.
 *
 * Module-level so two sibling overlays coordinate even if neither sits under a
 * provider — which is the whole point. Created lazily so importing this module
 * never touches `document`, keeping it safe in a non-DOM environment.
 */
let appStack: DismissStackApi | null = null
function getAppStack(): DismissStackApi {
  appStack ??= createStack()
  return appStack
}

const DismissStackContext = createContext<DismissStackApi | null>(null)

/**
 * Scopes a stack to a subtree.
 *
 * Only needed when overlays inside must not compete with overlays outside —
 * two independently mounted apps on one page, for instance. The app does not
 * need it for ordinary nesting; the default stack already handles that.
 */
export function DismissStackProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const api = useMemo(() => createStack(), [])
  return <DismissStackContext value={api}>{children}</DismissStackContext>
}

/**
 * Declare this component dismissable by Escape.
 *
 * ```tsx
 * useDismissable(onClose)                      // always dismissable
 * useDismissable(close, { enabled: isOpen })   // only while open
 * ```
 *
 * Call it once per layer, unconditionally. The layer joins the stack on mount
 * and leaves on unmount, and while it is the most recent enabled entry Escape
 * belongs to it — no coordination with any other layer, and nothing to change
 * when a new overlay appears above it later.
 */
export function useDismissable(
  onDismiss: () => void,
  { enabled = true }: { enabled?: boolean } = {},
): void {
  const scoped = use(DismissStackContext)

  // A stable entry whose fields are refreshed in place. Handing `register` a
  // new object whenever the callback identity changed would re-push on every
  // render and quietly move this layer to the top — so the last thing to
  // RE-RENDER would win Escape instead of the last thing to OPEN.
  const entryRef = useRef<DismissEntry>({ onDismiss, enabled })
  useEffect(() => {
    entryRef.current.onDismiss = onDismiss
    entryRef.current.enabled = enabled
  }, [onDismiss, enabled])

  useEffect(() => {
    const stack = scoped ?? getAppStack()
    return stack.register(entryRef.current)
  }, [scoped])
}

/**
 * The stack itself, for a component that owns its own key handling and wants to
 * delegate rather than duplicate.
 */
export function useDismissStack(): DismissStackApi {
  const scoped = use(DismissStackContext)
  return scoped ?? getAppStack()
}
