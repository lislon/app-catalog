import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import type { ReactNode } from 'react'
import { useExtensions } from './ExtensionsContext'
import type { OpaqueRenderer } from './types'

/**
 * Reported when a plugin's render throws.
 *
 * Deliberately not swallowed. With a `null` fallback and no report, a crashing
 * plugin is indistinguishable from an unregistered one — the button is simply
 * absent, in production and in tests alike. Routing it through `console.error`
 * is what makes `getGlobalError()` in the test kit able to assert it.
 */
function reportSlotError(plugin: string, slot: string, error: unknown): void {
  console.error(`[plugin:${plugin}] slot "${slot}" failed to render`, error)
}

const call = (fn: OpaqueRenderer, props: unknown): ReactNode =>
  (fn as (p: unknown) => ReactNode)(props)

/**
 * Invokes a plugin's handler from inside its own component.
 *
 * Not an inline `{call(render, props)}`: that expression is evaluated while the
 * surrounding `Slot` renders, which is BEFORE React mounts the ErrorBoundary
 * around it. A boundary only catches errors thrown by its descendants, so an
 * inline call escaped the boundary entirely and took the host down with it.
 * Putting the invocation in a child component is what moves the throw inside.
 */
function Contribution({
  render,
  props,
}: {
  render: OpaqueRenderer
  props: unknown
}): ReactNode {
  return call(render, props)
}

/**
 * Builds the component the core renders at one leaf slot.
 *
 * Every registered plugin contributing to this slot renders, in array order, so
 * two plugins can occupy the same point. Each is isolated: one plugin throwing
 * removes only its own node.
 *
 * Each contribution also gets its own `Suspense`. Without it a plugin that
 * suspends — any `useSuspenseQuery`, any lazy import — bubbles to the nearest
 * boundary above, which for the detail card is `AppCatalogPage`'s
 * `<Suspense fallback={null}>`; the whole card would then vanish until the
 * plugin's data arrived.
 */
export function makeSlot<TProps>(slotName: string) {
  function Slot(props: TProps): ReactNode {
    const plugins = useExtensions()

    return plugins.map((plugin) => {
      const render = plugin.slots?.[slotName]
      if (!render) return null
      return (
        <ErrorBoundary
          key={plugin.name}
          fallbackRender={() => null}
          onError={(error) => reportSlotError(plugin.name, slotName, error)}
        >
          <Suspense fallback={null}>
            <Contribution render={render} props={props} />
          </Suspense>
        </ErrorBoundary>
      )
    })
  }
  Slot.displayName = `Slot(${slotName})`
  return Slot
}

/**
 * Builds the component the core renders *around* a subtree.
 *
 * Folded right-to-left so the FIRST plugin in the array ends up outermost, which
 * makes nesting order readable from the array itself.
 *
 * Note the fallback differs from a leaf slot's: it is the accumulated children,
 * never `null`. A wrapper only decorates — usually by providing context — so a
 * broken one must not blank the core subtree it was wrapping.
 */
export function makeWrapper<TProps>(wrapperName: string) {
  function Wrapper(props: TProps & { children: ReactNode }): ReactNode {
    const plugins = useExtensions()
    const { children, ...rest } = props

    return plugins.reduceRight<ReactNode>((acc, plugin) => {
      const render = plugin.wrappers?.[wrapperName]
      if (!render) return acc
      return (
        <ErrorBoundary
          key={plugin.name}
          fallbackRender={() => acc}
          onError={(error) => reportSlotError(plugin.name, wrapperName, error)}
        >
          <Contribution render={render} props={{ ...rest, children: acc }} />
        </ErrorBoundary>
      )
    }, children)
  }
  Wrapper.displayName = `SlotWrapper(${wrapperName})`
  return Wrapper
}
