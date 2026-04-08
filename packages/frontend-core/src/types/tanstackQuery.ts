import type { TRPCRouter } from '@igstack/app-catalog-backend-core'
import '@tanstack/react-query'
import type { TRPCClient } from '@trpc/client'
import type { AcDb } from '~/userDb/AcDb'

export interface AcReactQueryMeta extends Record<string, unknown> {
  trpcClient: TRPCClient<TRPCRouter>
  db: AcDb
}

declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: AcReactQueryMeta
    mutationMeta: AcReactQueryMeta
  }
}
