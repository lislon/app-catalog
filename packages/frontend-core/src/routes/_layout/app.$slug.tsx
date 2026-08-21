import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { z } from 'zod'
import { appCatalogRouteLoader } from '~/modules/appCatalog/routeLoader'

// Preserve the URL-synced filter params (see AppCatalogFiltersContext) on this
// route so they aren't stripped on navigation. `q` (the search text) is the
// exception: as of #27 it lives in sessionStorage, not the URL. It stays
// declared here so an incoming legacy `?q=` still validates, but the
// `stripSearchParams` middleware removes it so shared app links stay clean.
const searchSchema = z.object({
  filterTag: z.string().optional(),
  recent: z.string().optional(),
  filters: z.string().optional(),
  deprecated: z.string().optional(),
  q: z.string().optional(),
  sub: z.string().optional(),
})

export const Route = createFileRoute('/_layout/app/$slug')({
  component: () => null,
  validateSearch: searchSchema,
  search: { middlewares: [stripSearchParams(['q'])] },
  async loader() {
    const appCatalogLoader = await appCatalogRouteLoader()
    return { appCatalogLoader }
  },
})
