import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { z } from 'zod'
import { appCatalogRouteLoader } from '~/modules/appCatalog/routeLoader'

// #27: `q` (search text) no longer belongs in the URL — it lives in
// sessionStorage now. Keep it declared so incoming `?q=` validates, but the
// `stripSearchParams` middleware removes it so shared/bookmarked links stay clean.
const searchSchema = z.object({
  filterTag: z.string().optional(),
  q: z.string().optional(),
})

export const Route = createFileRoute('/_layout/')({
  // Renders nothing: the parent `_layout` route owns AppCatalogLayout +
  // AppCatalogPage for both this route and /app/$slug so the page instance (and
  // its scroll position) survives navigation between them. This route exists
  // only for the loader, search params and URL matching.
  //
  // Deliberately no `errorComponent`: like every other route here, loader
  // errors bubble to the single app-wide boundary (`errorComponent:
  // RootErrorPage` in __root.tsx). Adding a local one -- especially one that
  // renders null -- would swallow the failure with no error surface.
  component: () => null,
  validateSearch: searchSchema,
  search: { middlewares: [stripSearchParams(['q'])] },
  async loader() {
    const appCatalogLoader = await appCatalogRouteLoader()
    return { appCatalogLoader }
  },
})
