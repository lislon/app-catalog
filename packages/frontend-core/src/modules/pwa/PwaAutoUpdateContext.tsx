import type { ReactNode } from 'react'
import { createContext, use, useEffect, useMemo, useRef } from 'react'
import { PwaAutoUpdateController } from './PwaAutoUpdateController'
import type { PwaAutoUpdateOptions, PwaUpdateHandle } from './types'

export interface PwaAutoUpdateContextValue {
  triggerUpdateOnError: () => void
}

const PwaAutoUpdateContext = createContext<PwaAutoUpdateContextValue | null>(
  null,
)

interface PwaAutoUpdateProviderProps {
  handle: PwaUpdateHandle | undefined
  options?: PwaAutoUpdateOptions
  children: ReactNode
}

export function PwaAutoUpdateProvider({
  handle,
  options,
  children,
}: PwaAutoUpdateProviderProps) {
  const controllerRef = useRef<PwaAutoUpdateController | undefined>(undefined)
  const handleRef = useRef(handle)

  // A new handle (the registration arriving) goes to the running controller.
  // Declared first, so the effect below reads the current handle.
  useEffect(() => {
    handleRef.current = handle
    if (handle) controllerRef.current?.updateHandle(handle)
  }, [handle])

  // One controller for as long as there is a handle and the option values
  // hold. Keyed on values, not identities: rebuilding it drops its pending
  // visibility check and its idle tracking.
  const hasHandle = handle !== undefined
  const { idleTimeoutMs, minCheckIntervalMs, debug } = options ?? {}
  useEffect(() => {
    const current = handleRef.current
    if (!current) return

    const controller = new PwaAutoUpdateController(current, {
      idleTimeoutMs,
      minCheckIntervalMs,
      debug,
    })
    controllerRef.current = controller
    controller.start()

    return () => {
      controller.destroy()
      controllerRef.current = undefined
    }
  }, [hasHandle, idleTimeoutMs, minCheckIntervalMs, debug])

  const contextValue = useMemo<PwaAutoUpdateContextValue>(
    () => ({
      triggerUpdateOnError: () => {
        controllerRef.current?.triggerUpdateOnError()
      },
    }),
    [],
  )

  return (
    <PwaAutoUpdateContext value={contextValue}>{children}</PwaAutoUpdateContext>
  )
}

/**
 * Returns the PWA auto-update context, or null if outside the provider.
 * Null return allows graceful degradation when PWA is not configured.
 */
export function usePwaAutoUpdate(): PwaAutoUpdateContextValue | null {
  return use(PwaAutoUpdateContext)
}
