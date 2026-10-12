import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { DbProvider } from './userDb/DbContext'
import type { QueryClient } from '@tanstack/react-query'
import type { TRPCRouter } from '@igstack/app-catalog-backend-core'
import type { TRPCClient } from '@trpc/client'
import type { AcDb } from './userDb/AcDb'
import type { RegisteredRouter } from '@tanstack/react-router'
import { TRPCProvider } from './api/infra/trpc'
import type { UiSettings } from './types/uiSettings'
import { UiSettingsContext } from './context/UiSettingsContext'
import { ExtensionsContext } from './modules/extensions'
import type { AcPlugin } from './modules/extensions'

export interface AppProps {
  /**
   * `RegisteredRouter`, not `ReturnType<typeof createAcRouter>`.
   *
   * That was a type-only import, and a type-only import still pulls the
   * referenced file's `declare module` into the program — so naming
   * `createAcRouter` here put the core's `Register` augmentation into every
   * consumer, and a deployment composing its own route tree could not declare
   * its own without `TS2717`.
   *
   * This widens nothing: `RegisteredRouter` resolves per program against
   * whatever `Register` that program declared, so the core's own program gets
   * the core's router and a deployment gets its own, each exactly typed. A
   * router built from a different route tree is still rejected here.
   *
   * The one blind spot, guarded by a type test on the consumer side: with NO
   * `Register` anywhere in a program this silently degrades to `AnyRouter`.
   */
  router: RegisteredRouter
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
