import type { TRPCRouter } from '@igstack/app-catalog-backend-core'
import type { TRPCClient } from '@trpc/client'
import type { AcReactQueryMeta } from '~/types/tanstackQuery'
import type { AcDb } from '~/userDb/AcDb'

export function getTrpcFromMeta(ctx: {
  meta?: AcReactQueryMeta
}): TRPCClient<TRPCRouter> {
  if (!ctx.meta) {
    throw new Error('Missing TRPC client in context of react-query')
  }
  return ctx.meta.trpcClient
}

export function getDbFromMeta(ctx: { meta?: AcReactQueryMeta }): AcDb {
  if (!ctx.meta) {
    throw new Error('Missing DB in context of react-query')
  }
  return ctx.meta.db
}
