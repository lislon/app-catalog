import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { z } from 'zod'
import { catalogRouteLoader } from '~/modules/appCatalog/catalogRouteLoader'
import { AppCatalogLayout } from '~/modules/appCatalog/ui/layout/AppCatalogLayout'
import { AppCatalogPage } from '~/modules/appCatalog/ui/pages/AppCatalogPage'

// #27: `q` kept declared for legacy links but stripped from the URL (search
// text lives in sessionStorage now).
const searchSchema = z.object({
  app: z.string().optional(),
  q: z.string().optional(),
})

export const Route = createFileRoute('/_layout/catalog/apps/')({
  component: RouteComponent,
  validateSearch: searchSchema,
  search: { middlewares: [stripSearchParams(['q'])] },
  async loader(ctx) {
    await catalogRouteLoader(ctx)
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
