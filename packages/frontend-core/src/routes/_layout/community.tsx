import {
  Outlet,
  createFileRoute,
  stripSearchParams,
  useParams,
} from '@tanstack/react-router'
import { z } from 'zod'
import { AppCatalogLayout } from '~/modules/appCatalog/ui/layout/AppCatalogLayout'
import { CommunityPage } from '~/modules/communityTools/ui/CommunityPage'
import { useCommunityToolsConfig } from '~/modules/communityTools/useCommunityToolsConfig'
import { NotFoundError } from '~/ui/error/NotFoundError'
import { TopLevelProvidersForErrors } from '~/ui/layout/TopLevelProvidersForErrors'

// Each defaults to absent, so a plain /community link stays plain. A value that
// does not parse reads as absent rather than failing the route.
const searchSchema = z
  .object({
    /** `<kind>:<value>`, e.g. `topic:sandbox` or `app:order-service`. */
    tag: z.string().optional().catch(undefined),
    /** Popular when absent. */
    sort: z.enum(['newest', 'updated']).optional().catch(undefined),
    /** Descending when absent. */
    dir: z.enum(['asc']).optional().catch(undefined),
    /** The old window toggle: `newest` still means Newest; the param is dropped. */
    window: z.string().optional().catch(undefined),
  })
  .transform(({ window, ...search }) => ({
    ...search,
    sort:
      search.sort ?? (window === 'newest' ? ('newest' as const) : undefined),
    window: undefined,
  }))

export const Route = createFileRoute('/_layout/community')({
  component: RouteComponent,
  validateSearch: searchSchema,
  search: { middlewares: [stripSearchParams(['window'])] },
})

function RouteComponent() {
  const { queryClient, trpcClient } = Route.useRouteContext()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  // Set while a card is open: the child route's slug.
  const { slug } = useParams({ strict: false })
  // Read here, above the layout's providers, so a deployment with the feature
  // off answers a typed-in /community with the usual not-found page.
  const config = useCommunityToolsConfig({ queryClient, trpcClient })

  // A tag or sort change keeps an open card open: it navigates from the
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
        sort={search.sort ?? 'popular'}
        dir={search.dir ?? 'desc'}
        cardSlug={slug}
        onTagChange={(tag) => setSearch({ tag })}
        onSortChange={(sort, dir) =>
          setSearch({
            sort: sort === 'popular' ? undefined : sort,
            dir: dir === 'asc' ? 'asc' : undefined,
          })
        }
      />
      {/* The card route renders nothing; the page above reads its slug. */}
      <Outlet />
    </AppCatalogLayout>
  )
}
