import type { TRPCRouter } from '@igstack/app-catalog-backend-core'
import { useQuery } from '@tanstack/react-query'
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query'
import { useMemo } from 'react'
import type { AcRouterContext } from '~/types/types'

/**
 * The feature switch, read with the route context's clients, for the route
 * above the layout's providers. Same query key as the header's, so it is one
 * request. Here and not in the route file: a deployment compiles the core's
 * route files from its own tree, where these packages are other copies.
 */
export function useCommunityToolsConfig({
  queryClient,
  trpcClient,
}: Pick<AcRouterContext, 'queryClient' | 'trpcClient'>) {
  const options = useMemo(
    () =>
      createTRPCOptionsProxy<TRPCRouter>({
        client: trpcClient,
        queryClient,
      }).communityTools.config.queryOptions(),
    [queryClient, trpcClient],
  )
  return useQuery(options, queryClient).data
}
