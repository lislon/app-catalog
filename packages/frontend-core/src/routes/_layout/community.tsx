import type { TRPCRouter } from '@igstack/app-catalog-backend-core'
import { useQuery } from '@tanstack/react-query'
import { Outlet, createFileRoute, useParams } from '@tanstack/react-router'
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query'
import { useMemo } from 'react'
import { z } from 'zod'
import { AppCatalogLayout } from '~/modules/appCatalog/ui/layout/AppCatalogLayout'
import { CommunityPage } from '~/modules/communityTools/ui/CommunityPage'
import { NotFoundError } from '~/ui/error/NotFoundError'
import { TopLevelProvidersForErrors } from '~/ui/layout/TopLevelProvidersForErrors'

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
  // Set while a card is open: the child route's slug.
  const { slug } = useParams({ strict: false })
  // Read here, above the layout's providers, so a deployment with the feature
  // off answers a typed-in /community with the usual not-found page. Same
  // query key as the header's, so it is one request.
  const configOptions = useMemo(
    () =>
      createTRPCOptionsProxy<TRPCRouter>({
        client: trpcClient,
        queryClient,
      }).communityTools.config.queryOptions(),
    [queryClient, trpcClient],
  )
  const { data: config } = useQuery(configOptions, queryClient)

  // A tag or window change keeps an open card open: it navigates from the
  // current match, not from this parent route, which would drop the slug.
  const setSearch = (patch: Partial<typeof search>) =>
    void (slug
      ? navigate({
          to: '/community/$slug',
          params: { slug },
          search: (prev) => ({ ...prev, ...patch }),
        })
      : navigate({
          to: '/community',
          search: (prev) => ({ ...prev, ...patch }),
        }))

  if (config?.enabled === false) {
    return (
      <TopLevelProvidersForErrors>
        <NotFoundError />
      </TopLevelProvidersForErrors>
    )
  }

  return (
    <AppCatalogLayout queryClient={queryClient} trpcClient={trpcClient}>
      <CommunityPage
        tag={search.tag}
        feedWindow={search.window ?? 'month'}
        cardSlug={slug}
        onTagChange={(tag) => setSearch({ tag })}
        onWindowChange={(feedWindow) =>
          setSearch({ window: feedWindow === 'month' ? undefined : feedWindow })
        }
      />
      {/* The card route renders nothing; the page above reads its slug. */}
      <Outlet />
    </AppCatalogLayout>
  )
}
