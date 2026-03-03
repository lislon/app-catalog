import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { appCatalogRouteLoader } from '~/modules/appCatalog/routeLoader'
import { AppCatalogLayout } from '~/modules/appCatalog/ui/layout/AppCatalogLayout'
import { AppCatalogPage } from '~/modules/appCatalog/ui/pages/AppCatalogPage'

const searchSchema = z.object({
  app: z.string().optional(),
  filterTag: z.string().optional(),
})

export const Route = createFileRoute('/_layout/')({
  component: RouteComponent,
  validateSearch: searchSchema,
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
