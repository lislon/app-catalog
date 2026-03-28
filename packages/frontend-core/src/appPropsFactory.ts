import { createBrowserHistory } from '@tanstack/react-router'
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import { AcDb } from './userDb/AcDb'
import type { TRPCRouter } from '@igstack/app-catalog-backend-core'
import type { AppProps } from './App'
import type { AcPlugin } from './modules/pluginCore/types'
import { createQueryClient } from './api/infra/createQueryClient'
import { createAcRouter } from './util/createAcRouter'

// registerSW();
export function appPropsFactory(): AppProps {
  const trpcClient = createTRPCClient<TRPCRouter>({
    links: [
      httpBatchLink({
        url: `${window.location.origin}/api/trpc`,
      }),
    ],
  })

  const db = new AcDb()
  const queryClient = createQueryClient({ trpcClient, db })
  const plugins: AcPlugin[] = [
    // Future plugins can be added here
  ]
  const router = createAcRouter({
    history: createBrowserHistory(),
    context: {
      queryClient,
      trpcClient,
      db,
      plugins,
      boostrapHealth: {},
    },
  })

  return { router, queryClient, trpcClient, db }
}
