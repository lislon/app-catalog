import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import type { AcRouterContext } from '~/types/types'
import { RootErrorPage } from '~/ui/components/error/RootErrorPage'
import { NotFoundError } from '~/ui/error/NotFoundError'
import { LoadingScreen } from '~/ui/layout/LoadingScreen'
import { TopLevelProvidersForErrors } from '~/ui/layout/TopLevelProvidersForErrors'

export const Route = createRootRouteWithContext<AcRouterContext>()({
  component: RootRoute,
  errorComponent: RootErrorPage,
  // These fallbacks render MainLayout → Header → useAuth(), so they must be
  // wrapped in the providers (Auth + AuthModal + Theme + Tooltip). The router
  // renders pending/notFound OUTSIDE the route-component subtree, i.e. outside
  // the app's TopLevelProviders — without this wrap they throw
  // "useAuth must be used within AuthProvider" (see #6/#7).
  pendingComponent: () => (
    <TopLevelProvidersForErrors>
      <LoadingScreen label="root pending" />
    </TopLevelProvidersForErrors>
  ),
  notFoundComponent: () => (
    <TopLevelProvidersForErrors>
      <NotFoundError />
    </TopLevelProvidersForErrors>
  ),
  wrapInSuspense: true,
})

function RootRoute() {
  return (
    <div className="min-h-screen bg-base-200">
      <Outlet />
      {import.meta.env.MODE === 'dev' ? <TanStackRouterDevtools /> : null}
    </div>
  )
}
