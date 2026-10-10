import { createBrowserHistory } from '@tanstack/react-router'
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import { AcDb } from './userDb/AcDb'
import type { TRPCRouter } from '@igstack/app-catalog-backend-core'
import type { RegisteredRouter } from '@tanstack/react-router'
import type { AppProps } from './App'
import type { AcPlugin } from './modules/pluginCore/types'
import type { AcRouterInitParams } from './types/types'
import { createQueryClient } from './api/infra/createQueryClient'

export interface AppPropsFactoryOptions {
  /**
   * How to build the router.
   *
   * Injected rather than imported, because the ROUTE TREE belongs to the
   * deployment. A deployment that composes its own tree declares its own
   * `declare module … Register`, and importing the core's `createAcRouter`
   * here would put the core's competing augmentation into that program — a
   * hard `TS2717`, and `import type` would not help: augmentations are
   * collected when the program is built.
   *
   * Using the core's tree unchanged? Pass `createAcRouter` from
   * `@igstack/app-catalog-frontend-core/router`.
   */
  createRouter: (init: AcRouterInitParams) => RegisteredRouter
}

// registerSW();
export function appPropsFactory({
  createRouter,
}: AppPropsFactoryOptions): AppProps {
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
  const router = createRouter({
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
