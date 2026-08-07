import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { z } from 'zod'
import { appCatalogRouteLoader } from '~/modules/appCatalog/routeLoader'
import { AppCatalogLayout } from '~/modules/appCatalog/ui/layout/AppCatalogLayout'
import { AppCatalogPage } from '~/modules/appCatalog/ui/pages/AppCatalogPage'

// #27: `q` (search text) no longer belongs in the URL — it lives in
// sessionStorage now. Keep it declared so incoming `?q=` validates, but the
// `stripSearchParams` middleware removes it so shared/bookmarked links stay clean.
const searchSchema = z.object({
  filterTag: z.string().optional(),
  q: z.string().optional(),
})

export const Route = createFileRoute('/_layout/')({
  component: RouteComponent,
  validateSearch: searchSchema,
  search: { middlewares: [stripSearchParams(['q'])] },
  async loader() {
    const appCatalogLoader = await appCatalogRouteLoader()
    return {
      appCatalogLoader,
    }
  },
})

function RouteComponent() {
  const { queryClient, trpcClient } = Route.useRouteContext()

  return (
    <AppCatalogLayout queryClient={queryClient} trpcClient={trpcClient}>
      <AppCatalogPage />
    </AppCatalogLayout>
  )
}
