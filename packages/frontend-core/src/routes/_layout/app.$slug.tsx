import { createFileRoute } from '@tanstack/react-router'
import { appCatalogRouteLoader } from '~/modules/appCatalog/routeLoader'
import { AppCatalogLayout } from '~/modules/appCatalog/ui/layout/AppCatalogLayout'
import { AppCatalogPage } from '~/modules/appCatalog/ui/pages/AppCatalogPage'

export const Route = createFileRoute('/_layout/app/$slug')({
  component: RouteComponent,
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
