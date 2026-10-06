import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { DbProvider } from './userDb/DbContext'
import type { QueryClient } from '@tanstack/react-query'
import type { TRPCRouter } from '@igstack/app-catalog-backend-core'
import type { TRPCClient } from '@trpc/client'
import type { AcDb } from './userDb/AcDb'
import type { createAcRouter } from './util/createAcRouter'
import { TRPCProvider } from './api/infra/trpc'
import type { UiSettings } from './types/uiSettings'
import { UiSettingsContext } from './context/UiSettingsContext'
import { ExtensionsContext } from './modules/extensions'
import type { AcPlugin } from './modules/extensions'

export interface AppProps {
  router: ReturnType<typeof createAcRouter>
  queryClient: QueryClient
  trpcClient: TRPCClient<TRPCRouter>
  db: AcDb
  uiSettings?: UiSettings
  /**
   * Deployment-specific UI, rendered at the slots the core declares. Optional:
   * with none registered every slot renders nothing and the UI is identical to
   * one with no slots at all.
   *
   * Must be a module-level constant — see `AcPlugin`.
   */
  extensions?: readonly AcPlugin[]
}

export function App({
  router,
  queryClient,
  trpcClient,
  db,
  uiSettings,
  extensions,
}: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider queryClient={queryClient} trpcClient={trpcClient}>
        <DbProvider db={db}>
          <UiSettingsContext value={uiSettings}>
            {/* Above the router, so a slot anywhere in the tree can read it. */}
            <ExtensionsContext value={extensions}>
              <RouterProvider router={router} />
            </ExtensionsContext>
          </UiSettingsContext>
        </DbProvider>
      </TRPCProvider>
    </QueryClientProvider>
  )
}
