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

  useEffect(() => {
    if (!handle) return

    const controller = new PwaAutoUpdateController(handle, options)
    controllerRef.current = controller
    controller.start()

    return () => {
      controller.destroy()
      controllerRef.current = undefined
    }
  }, [handle, options])

  // Update handle when registration arrives async
  useEffect(() => {
    if (handle && controllerRef.current) {
      controllerRef.current.updateHandle(handle)
    }
  }, [handle])

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
