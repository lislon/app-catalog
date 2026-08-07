import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { z } from 'zod'
import { appCatalogRouteLoader } from '~/modules/appCatalog/routeLoader'
import { AppCatalogLayout } from '~/modules/appCatalog/ui/layout/AppCatalogLayout'
import { ServiceDesksPage } from '~/modules/appCatalog/ui/pages/ServiceDesksPage'

// #27: `q` kept declared for legacy links but stripped from the URL (search
// text lives in sessionStorage now).
const searchSchema = z.object({
  q: z.string().optional(),
})

export const Route = createFileRoute('/_layout/service-desks')({
  component: RouteComponent,
  validateSearch: searchSchema,
  search: { middlewares: [stripSearchParams(['q'])] },
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
