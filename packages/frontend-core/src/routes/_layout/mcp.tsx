import {
  Outlet,
  createFileRoute,
  useNavigate,
  useParams,
} from '@tanstack/react-router'
import { z } from 'zod'
import { AppCatalogLayout } from '~/modules/appCatalog/ui/layout/AppCatalogLayout'
import { McpCatalogPage } from '~/modules/mcpCatalog/McpCatalogPage'
import { McpServerDetail } from '~/modules/mcpCatalog/McpServerDetail'
import { useHasMcpServers } from '~/modules/mcpCatalog/useHasMcpServers'
import { NotFoundError } from '~/ui/error/NotFoundError'
import { TopLevelProvidersForErrors } from '~/ui/layout/TopLevelProvidersForErrors'

// Both absent by default, so a plain /mcp link stays plain.
const searchSchema = z.object({
  /** The search, so a search can be shared. */
  q: z.string().optional().catch(undefined),
  /** Comma-separated slugs of a shared cart. */
  cart: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/_layout/mcp')({
  component: RouteComponent,
  validateSearch: searchSchema,
})

function RouteComponent() {
  const { queryClient, trpcClient } = Route.useRouteContext()
  const { q } = Route.useSearch()
  // Unscoped, so `to: '.'` is the current match: a child route under /mcp
  // keeps its params while the query changes.
  const navigate = useNavigate()
  // Set while a server's dialog is open: the child route's slug.
  const { slug } = useParams({ strict: false })
  const hasServers = useHasMcpServers(queryClient)

  if (hasServers === false) {
    return (
      <TopLevelProvidersForErrors>
        <NotFoundError />
      </TopLevelProvidersForErrors>
    )
  }

  return (
    <AppCatalogLayout queryClient={queryClient} trpcClient={trpcClient}>
      <McpCatalogPage
        q={q ?? ''}
        onQueryChange={(next) =>
          void navigate({
            to: '.',
            search: (prev) => ({ ...prev, q: next || undefined }),
            replace: true,
          })
        }
      />
      {slug && (
        <McpServerDetail
          slug={slug}
          // Back to the list with the search it was opened from.
          onClose={() => void navigate({ to: '/mcp', search: (prev) => prev })}
        />
      )}
      {/* The detail route renders nothing; the dialog above reads its slug. */}
      <Outlet />
    </AppCatalogLayout>
  )
}
