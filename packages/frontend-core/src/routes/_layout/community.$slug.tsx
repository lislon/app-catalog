import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/community/$slug')({
  // Renders nothing: the parent `/community` route owns the page, so the list
  // stays mounted (and keeps its scroll) under the card for this slug.
  component: () => null,
})
