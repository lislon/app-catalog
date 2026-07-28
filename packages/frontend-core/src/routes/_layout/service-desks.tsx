import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { appCatalogRouteLoader } from '~/modules/appCatalog/routeLoader'
import { AppCatalogLayout } from '~/modules/appCatalog/ui/layout/AppCatalogLayout'
import { ServiceDesksPage } from '~/modules/appCatalog/ui/pages/ServiceDesksPage'

const searchSchema = z.object({
  q: z.string().optional(),
})

export const Route = createFileRoute('/_layout/service-desks')({
  component: RouteComponent,
  validateSearch: searchSchema,
  async loader() {
    const appCatalogLoader = await appCatalogRouteLoader()
    return { appCatalogLoader }
  },
})

function RouteComponent() {
  const { queryClient, trpcClient } = Route.useRouteContext()

  return (
    <AppCatalogLayout queryClient={queryClient} trpcClient={trpcClient}>
      <ServiceDesksPage />
    </AppCatalogLayout>
  )
}
