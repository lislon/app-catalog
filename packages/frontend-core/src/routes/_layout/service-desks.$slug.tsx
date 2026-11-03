import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const searchSchema = z.object({
  /** The card's tab, owned by DetailTabs. */
  tab: z.string().optional(),
})

/**
 * One form's card, `/service-desks/<desk key>-<form id>`. Renders nothing: the
 * parent `/service-desks` route owns the page and reads the slug from the
 * router, so opening a card never remounts the list or loses the search.
 */
export const Route = createFileRoute('/_layout/service-desks/$slug')({
  component: () => null,
  validateSearch: searchSchema,
})
