import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { z } from 'zod'

// Preserve the URL-synced filter params (see AppCatalogFiltersContext) on this
// route so they aren't stripped on navigation. `q` (the search text) is the
// exception: as of #27 it lives in sessionStorage, not the URL. It stays
// declared here so an incoming legacy `?q=` still validates, but the
// `stripSearchParams` middleware removes it so shared app links stay clean.
const searchSchema = z.object({
  filterTag: z.string().optional(),
  deprecated: z.string().optional(),
  q: z.string().optional(),
  sub: z.string().optional(),
  /** Quick Jump's chosen destination (see quickJumpSlug). */
  qj: z.string().optional(),
})

export const Route = createFileRoute('/_layout/app/$slug')({
  // Renders nothing: the parent `_layout` route owns AppCatalogLayout +
  // AppCatalogPage for both this route and the catalog index, and reads the
  // open app's slug from the router matches. This route exists only for its
  // search params and URL matching.
  //
  // Deliberately no loader. It used to await one that returned `{}` and had no
  // readers, which cost nothing but made every navigation here async: a `?qj=`
  // or `?sub=` change re-ran it, the match went pending, and the detail panel
  // was unmounted and rebuilt -- losing whatever the user had typed into it and
  // refetching the whole catalog (#152).
  component: () => null,
  validateSearch: searchSchema,
  search: { middlewares: [stripSearchParams(['q'])] },
})
