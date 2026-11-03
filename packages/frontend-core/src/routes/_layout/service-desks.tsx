import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { z } from 'zod'
import { AppCatalogLayout } from '~/modules/appCatalog/ui/layout/AppCatalogLayout'
import { ServiceDesksPage } from '~/modules/appCatalog/ui/pages/ServiceDesksPage'

// #27: `q` kept declared for legacy links but stripped from the URL (search
// text lives in sessionStorage now).
const searchSchema = z.object({
  q: z.string().optional(),
  /** The desk whose card is open (its approval-method slug). */
  desk: z.string().optional(),
  /**
   * The form the card was opened on, when it came from a search result. A
   * number when the id is all digits: the router writes a digit-only string
   * as `"69"`, quotes and all, and a hand-typed `form=69` reads back as one.
   */
  form: z.union([z.number(), z.string()]).optional(),
  /** The card's tab, owned by DetailTabs. */
  tab: z.string().optional(),
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
