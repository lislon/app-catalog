import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { z } from 'zod'
import { AppCatalogLayout } from '~/modules/appCatalog/ui/layout/AppCatalogLayout'
import { ServiceDesksPage } from '~/modules/appCatalog/ui/pages/ServiceDesksPage'

// #27: `q` kept declared for legacy links but stripped from the URL (search
// text lives in sessionStorage now).
const searchSchema = z.object({
  q: z.string().optional(),
  /**
   * Legacy card address, `?desk=<method slug>&form=<id>`, shipped briefly before
   * cards moved to `/service-desks/<slug>`. Read once and redirected.
   */
  desk: z.string().optional(),
  form: z.union([z.number(), z.string()]).optional(),
})

export const Route = createFileRoute('/_layout/service-desks')({
  component: RouteComponent,
  validateSearch: searchSchema,
  search: { middlewares: [stripSearchParams(['q'])] },
})

function RouteComponent() {
  const { queryClient, trpcClient } = Route.useRouteContext()

  return (
    <AppCatalogLayout queryClient={queryClient} trpcClient={trpcClient}>
      <ServiceDesksPage />
    </AppCatalogLayout>
  )
}
