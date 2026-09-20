import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { z } from 'zod'

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
  // only for its search params and URL matching.
  //
  // Deliberately no loader: see the note on /app/$slug (#152).
  component: () => null,
  validateSearch: searchSchema,
  search: { middlewares: [stripSearchParams(['q'])] },
})
