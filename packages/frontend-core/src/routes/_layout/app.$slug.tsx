import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { appCatalogRouteLoader } from '~/modules/appCatalog/routeLoader'
import { AppCatalogLayout } from '~/modules/appCatalog/ui/layout/AppCatalogLayout'
import { AppCatalogPage } from '~/modules/appCatalog/ui/pages/AppCatalogPage'

// Preserve the URL-synced filter params (see AppCatalogFiltersContext) on this
// route so they aren't stripped on navigation — the search query `q` in
// particular must survive auto-navigation to an app's detail page (#10).
const searchSchema = z.object({
  q: z.string().optional(),
  filterTag: z.string().optional(),
  recent: z.string().optional(),
  filters: z.string().optional(),
  deprecated: z.string().optional(),
})

export const Route = createFileRoute('/_layout/app/$slug')({
  component: RouteComponent,
  validateSearch: searchSchema,
  async loader() {
    const appCatalogLoader = await appCatalogRouteLoader()
    return { appCatalogLoader }
  },
})

function RouteComponent() {
  const { queryClient, trpcClient } = Route.useRouteContext()
  const { slug } = Route.useParams()

  return (
    <AppCatalogLayout queryClient={queryClient} trpcClient={trpcClient}>
      <AppCatalogPage selectedSlug={slug} />
    </AppCatalogLayout>
  )
}
