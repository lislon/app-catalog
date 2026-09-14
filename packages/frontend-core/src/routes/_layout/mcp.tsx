import { createFileRoute } from '@tanstack/react-router'
import { appCatalogRouteLoader } from '~/modules/appCatalog/routeLoader'
import { AppCatalogLayout } from '~/modules/appCatalog/ui/layout/AppCatalogLayout'
import { McpPage } from '~/modules/appCatalog/ui/pages/McpPage'

export const Route = createFileRoute('/_layout/mcp')({
  component: RouteComponent,
  async loader() {
    const appCatalogLoader = await appCatalogRouteLoader()
    return { appCatalogLoader }
  },
})

function RouteComponent() {
  const { queryClient, trpcClient } = Route.useRouteContext()

  return (
    <AppCatalogLayout queryClient={queryClient} trpcClient={trpcClient}>
      <McpPage />
    </AppCatalogLayout>
  )
}
