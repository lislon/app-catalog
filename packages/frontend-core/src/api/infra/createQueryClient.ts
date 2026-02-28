import { QueryClient } from '@tanstack/react-query'
import type { TRPCRouter } from '@igstack/app-catalog-backend-core'
import type { TRPCClient } from '@trpc/client'
import type { AcDb } from '~/userDb/AcDb'

export interface CreateQueryParams {
  trpcClient: TRPCClient<TRPCRouter>
  db: AcDb
}

export function createQueryClient({ trpcClient, db }: CreateQueryParams) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
        meta: {
          trpcClient,
          db,
        },
      },
      mutations: {
        meta: {
          trpcClient,
          db,
        },
      },
    },
  })
}
