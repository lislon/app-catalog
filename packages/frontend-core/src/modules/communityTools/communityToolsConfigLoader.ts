import type { TRPCRouter } from '@igstack/app-catalog-backend-core'
import type { QueryFunctionContext } from '@tanstack/react-query'
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query'
import { createCachingFetcher } from '~/api/unsorted/createCachingFetcher'
import type { AcRouterContext } from '~/types/types'
import { dbCacheDbKeys } from '~/userDb/AcDb'

/**
 * The feature switch, loaded before the layout renders when IndexedDB has it,
 * with the network in the background. The header's tabs then render complete
 * on the first paint and offline, instead of gaining Community tools a
 * round-trip later. Stored under tRPC's own key, so every
 * `config.queryOptions()` reader gets it.
 */
export async function communityToolsConfigLoader({
  context,
}: {
  context: AcRouterContext
}): Promise<void> {
  const { db, queryClient, trpcClient } = context
  const queryKey = createTRPCOptionsProxy<TRPCRouter>({
    client: trpcClient,
    queryClient,
  }).communityTools.config.queryKey()

  const queryFn = createCachingFetcher({
    cacheKey: dbCacheDbKeys.CommunityToolsConfig,
    networkFetchFn: () => trpcClient.communityTools.config.query(),
    getDbTable: () => db.communityToolsConfig,
    queryKey,
  })
  const ctx: QueryFunctionContext = {
    queryKey,
    meta: { db, trpcClient },
    client: queryClient,
    signal: new AbortController().signal,
  }

  const loaded = queryFn(ctx)
    .then((data) => {
      if (data) {
        queryClient.setQueryData(queryKey, data)
      }
    })
    .catch((error: unknown) => {
      // Nothing cached and no server: the tab stays hidden, the page still opens.
      console.debug('Community tools config unavailable:', error)
    })

  // Wait only for IndexedDB. A first-ever visit has nothing stored, so the
  // page renders without waiting on the network and the tab joins when the
  // server answers.
  if ((await db.communityToolsConfig.count()) > 0) {
    await loaded
  }
}
