import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { AppCatalogLayout } from '~/modules/appCatalog/ui/layout/AppCatalogLayout'
import { McpCatalogPage } from '~/modules/mcpCatalog/McpCatalogPage'

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
  const navigate = Route.useNavigate()

  return (
    <AppCatalogLayout queryClient={queryClient} trpcClient={trpcClient}>
      <McpCatalogPage
        initialQuery={q ?? ''}
        onQueryChange={(next) =>
          void navigate({
            search: (prev) => ({ ...prev, q: next || undefined }),
            replace: true,
          })
        }
      />
    </AppCatalogLayout>
  )
}
