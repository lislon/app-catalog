import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { z } from 'zod'
import { appCatalogRouteLoader } from '~/modules/appCatalog/routeLoader'

// A sub-resource's own page. Same search params as the parent app route (the
// URL-synced filters must survive navigating in and back out), same
// render-nothing contract: `_layout` owns AppCatalogPage and reads both slugs
// off the router matches.
//
// `$slug_` de-nests this from `/app/$slug`: that route renders no Outlet, so
// nesting under it would leave this match mounted but never rendered.
const searchSchema = z.object({
  filterTag: z.string().optional(),
  recent: z.string().optional(),
  filters: z.string().optional(),
  deprecated: z.string().optional(),
  q: z.string().optional(),
  sub: z.string().optional(),
})

export const Route = createFileRoute('/_layout/app/$slug_/sub/$subSlug')({
  component: () => null,
  validateSearch: searchSchema,
  search: { middlewares: [stripSearchParams(['q'])] },
  async loader() {
    const appCatalogLoader = await appCatalogRouteLoader()
    return { appCatalogLoader }
  },
})
