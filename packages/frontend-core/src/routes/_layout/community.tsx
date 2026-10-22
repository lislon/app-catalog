import { Outlet, createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { AppCatalogLayout } from '~/modules/appCatalog/ui/layout/AppCatalogLayout'
import { CommunityPage } from '~/modules/communityTools/ui/CommunityPage'

// Both default to absent, so a plain /community link stays plain. A value that
// does not parse reads as absent rather than failing the route.
const searchSchema = z.object({
  /** `<kind>:<value>`, e.g. `topic:sandbox` or `app:order-service`. */
  tag: z.string().optional().catch(undefined),
  window: z.enum(['all', 'newest']).optional().catch(undefined),
})

export const Route = createFileRoute('/_layout/community')({
  component: RouteComponent,
  validateSearch: searchSchema,
})

function RouteComponent() {
  const { queryClient, trpcClient } = Route.useRouteContext()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <AppCatalogLayout queryClient={queryClient} trpcClient={trpcClient}>
      <CommunityPage
        tag={search.tag}
        feedWindow={search.window ?? 'month'}
        onTagChange={(tag) =>
          void navigate({ to: '.', search: (prev) => ({ ...prev, tag }) })
        }
        onWindowChange={(feedWindow) =>
          void navigate({
            to: '.',
            search: (prev) => ({
              ...prev,
              window: feedWindow === 'month' ? undefined : feedWindow,
            }),
          })
        }
      />
      {/* The card route renders nothing; the page above reads its slug. */}
      <Outlet />
    </AppCatalogLayout>
  )
}
