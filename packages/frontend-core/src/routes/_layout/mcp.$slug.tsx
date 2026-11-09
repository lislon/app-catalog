import { createFileRoute } from '@tanstack/react-router'

/**
 * One server's detail dialog, `/mcp/<slug>`. Renders nothing: the parent
 * `/mcp` route owns the page and reads the slug, so opening a server never
 * remounts the list or loses the search.
 */
export const Route = createFileRoute('/_layout/mcp/$slug')({
  component: () => null,
})
