import { createContext, use, useEffect, useMemo, useRef } from 'react'

/**
 * One Escape key, one answer: dismiss the layer on top.
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
 * A layer now says only "I am dismissable, and this element is me". The stack
 * decides who Escape belongs to, and no layer needs to know another exists.
 *
 * "On top" is DOCUMENT ORDER, the last enabled layer in the document. Two
 * cheaper keys were tried first and both broke:
 *
 * - Registration order. React runs a child's effects before its parent's, so
 *   an overlay nested inside another registers FIRST and the container looks
 *   newer: Escape in the screenshot viewer closed the card under it.
 * - Activation time. On a cold deep link the dialog's route resolves before
 *   the catalog arrives, so the card it sits over mounts LATER and looks
 *   newer: Escape closed the card first, and the card took focus back off the
 *   dialog's first field.
 *
 * Document order has neither problem because it is what "on top" means on
 * screen: a portal appends to the end of `<body>`, a child route renders after
 * its parent's page, and a nested layer is a descendant — and a descendant
 * follows its ancestor in document order. None of it depends on when anything
 * mounted.
 *
 * `useDismissable` works with or without a provider above it, on purpose. A
 * hook that silently did nothing outside a provider would be the same class of
 * bug this module exists to delete — every render site, including tests and
 * stories, would have to remember a wrapper, and forgetting it would look like
 * working code with dead Escape handling. So an app-wide stack is the default
 * and `DismissStackProvider` is only for scoping.
 */

interface DismissEntry {
  /** The layer's root element; its position in the document is its rank. */
  layer: { readonly current: HTMLElement | null }
  /** Called when Escape belongs to this layer. */
  onDismiss: () => void
  /**
   * A layer can stay registered and opt out — a collapsed panel, a closed
   * popover. Skipped when choosing the top rather than unregistering.
   */
  enabled: boolean
}

export interface DismissStackApi {
  /** Adds an entry and returns its unregister function. */
  register: (entry: DismissEntry) => () => void
  /** Dismisses the top layer; reports whether there was one. */
  dismissTop: () => boolean
  /**
   * The top layer's element, or null when nothing is open. For a layer that
   * takes focus on mount: it should only do so while it is on top, or it
   * steals the caret from whatever was opened over it.
   */
  topElement: () => HTMLElement | null
}

function isAfter(a: HTMLElement, b: HTMLElement): boolean {
  // A descendant reports FOLLOWING as well as CONTAINED_BY, so this one test
  // covers both "rendered later" and "nested inside".
  return (b.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
}

function createStack(): DismissStackApi {
  const entries: DismissEntry[] = []

  const top = (): DismissEntry | undefined => {
    let best: DismissEntry | undefined
    for (const entry of entries) {
      const el = entry.layer.current
      // Not in the document yet, or already gone: not something on screen.
      if (!entry.enabled || !el?.isConnected) continue
      const bestEl = best?.layer.current
      if (!bestEl || isAfter(el, bestEl)) best = entry
    }
    return best
  }

  const dismissTop = () => {
    const entry = top()
    if (!entry) return false
    entry.onDismiss()
    return true
  }

  const topElement = () => top()?.layer.current ?? null

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return
    // Something closer to the event already dealt with it — a text field
    // cancelling an edit, say. Honoured rather than overridden: the element the
    // user is typing in is more specific than any layer containing it.
    //
    // This check is the reason the listener below is on the BUBBLE phase. In
    // capture it would run before every component handler, so `defaultPrevented`
    // would always be false and a field could never keep Escape for itself.
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
        return
      }
      // When a layer closes, the caret it held goes with it and lands on
      // <body>, where the next Tab walks whatever is behind every overlay and
      // Escape still works only because this listener is on the document.
      // Hand it to the layer that is now on top. Only from <body>: if
      // something already restored focus — Radix returns it to the trigger —
      // that choice is more specific than this one and stands.
      queueMicrotask(() => {
        if (document.activeElement && document.activeElement !== document.body)
          return
        topElement()?.focus()
      })
    }
  }

  return { register, dismissTop, topElement }
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
 * Declare this layer dismissable by Escape.
 *
 * ```tsx
 * const ref = useRef<HTMLDivElement>(null)
 * useDismissable(ref, onClose)                      // always dismissable
 * useDismissable(ref, close, { enabled: isOpen })   // only while open
 * return <div ref={ref} role="dialog">…</div>
 * ```
 *
 * `ref` is the layer's root element, and it is required rather than optional
 * because it IS the ordering: the last enabled layer in the document owns
 * Escape. Call the hook once per layer, unconditionally; nothing else
 * coordinates with any other layer, and adding one above an existing layer
 * needs no change to it.
 */
export function useDismissable(
  layer: { readonly current: HTMLElement | null },
  onDismiss: () => void,
  { enabled = true }: { enabled?: boolean } = {},
): void {
  const scoped = use(DismissStackContext)
  const stack = scoped ?? getAppStack()

  // A stable entry whose fields are refreshed in place. Handing `register` a
  // new object whenever the callback identity changed would churn the stack on
  // every render for no benefit.
  const entryRef = useRef<DismissEntry>({ layer, onDismiss, enabled })
  useEffect(() => {
    entryRef.current.layer = layer
    entryRef.current.onDismiss = onDismiss
    entryRef.current.enabled = enabled
  }, [layer, onDismiss, enabled])

  useEffect(() => stack.register(entryRef.current), [stack])
}

/**
 * The stack itself, for a component that owns its own key handling or focus
 * and wants stack ordering instead of inventing its own.
 */
export function useDismissStack(): DismissStackApi {
  const scoped = use(DismissStackContext)
  return scoped ?? getAppStack()
}
