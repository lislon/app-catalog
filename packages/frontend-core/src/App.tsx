import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { DbProvider } from './userDb/DbContext'
import type { QueryClient } from '@tanstack/react-query'
import type { TRPCRouter } from '@igstack/app-catalog-backend-core'
import type { TRPCClient } from '@trpc/client'
import type { AcDb } from './userDb/AcDb'
import type { createEhRouter } from '~/util/createEhRouter'
import { TRPCProvider } from '~/api/infra/trpc'

export interface AppProps {
  router: ReturnType<typeof createEhRouter>
  queryClient: QueryClient
  trpcClient: TRPCClient<TRPCRouter>
  db: AcDb
}

export function App({ router, queryClient, trpcClient, db }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider queryClient={queryClient} trpcClient={trpcClient}>
        <DbProvider db={db}>
          <RouterProvider router={router} />
        </DbProvider>
      </TRPCProvider>
    </QueryClientProvider>
  )
}
