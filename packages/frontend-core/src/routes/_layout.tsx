import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { AppCatalogLayout } from '~/modules/appCatalog/ui/layout/AppCatalogLayout'
import { AppCatalogPage } from '~/modules/appCatalog/ui/pages/AppCatalogPage'

export const Route = createFileRoute('/_layout')({
  component: LayoutComponent,
})

// Route IDs that belong to the catalog (list + detail). Both share a single
// AppCatalogPage instance so the component never unmounts between them,
// preserving scroll position when opening/closing the app detail overlay.
const CATALOG_ROUTE_IDS = new Set(['/_layout/', '/_layout/app/$slug'])

function LayoutComponent() {
  // All hooks must be called unconditionally (rules of hooks).
  const { queryClient, trpcClient } = Route.useRouteContext()
  const matches = useRouterState({ select: (s) => s.matches })

  const isCatalogRoute = matches.some((m) => CATALOG_ROUTE_IDS.has(m.routeId))
  const slugMatch = matches.find((m) => m.routeId === '/_layout/app/$slug')
  const selectedSlug = (slugMatch?.params as { slug?: string } | undefined)
    ?.slug

  if (!isCatalogRoute) {
    return <Outlet />
  }

  return (
    <AppCatalogLayout queryClient={queryClient} trpcClient={trpcClient}>
      <AppCatalogPage selectedSlug={selectedSlug} />
    </AppCatalogLayout>
  )
}
