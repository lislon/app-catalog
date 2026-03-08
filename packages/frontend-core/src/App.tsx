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

export interface AppProps {
  router: ReturnType<typeof createAcRouter>
  queryClient: QueryClient
  trpcClient: TRPCClient<TRPCRouter>
  db: AcDb
  uiSettings?: UiSettings
}

export function App({
  router,
  queryClient,
  trpcClient,
  db,
  uiSettings,
}: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider queryClient={queryClient} trpcClient={trpcClient}>
        <DbProvider db={db}>
          <UiSettingsContext value={uiSettings}>
            <RouterProvider router={router} />
          </UiSettingsContext>
        </DbProvider>
      </TRPCProvider>
    </QueryClientProvider>
  )
}
