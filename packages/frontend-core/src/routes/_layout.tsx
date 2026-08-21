import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { AppCatalogLayout } from '~/modules/appCatalog/ui/layout/AppCatalogLayout'
import { AppCatalogPage } from '~/modules/appCatalog/ui/pages/AppCatalogPage'
// Route ids are read off the route objects instead of being spelled out as
// string literals: renaming/moving either file is then a compile error here
// rather than a silently non-matching id at runtime. `Route.id` is only
// populated once the router builds the tree, so it must be read at render
// time (inside the selector), never at module scope.
import { Route as AppDetailRoute } from './_layout/app.$slug'
import { Route as CatalogIndexRoute } from './_layout/index'

export const Route = createFileRoute('/_layout')({
  component: LayoutComponent,
})

function LayoutComponent() {
  // All hooks must be called unconditionally (rules of hooks).
  const { queryClient, trpcClient } = Route.useRouteContext()

  // The catalog routes (list + detail) share a single AppCatalogPage instance
  // so the component never unmounts between them, preserving scroll position
  // when opening/closing the app detail overlay.
  //
  // The selector returns only the two derived values, so this component
  // re-renders when the catalog branch or the open app changes -- not on every
  // router state update. `useStore` shallow-compares the result, so returning
  // an object is still referentially stable.
  const { isCatalogRoute, selectedSlug } = useRouterState({
    select: (s) => {
      const detailMatch = s.matches.find((m) => m.routeId === AppDetailRoute.id)
      return {
        isCatalogRoute:
          detailMatch !== undefined ||
          s.matches.some((m) => m.routeId === CatalogIndexRoute.id),
        selectedSlug: (detailMatch?.params as { slug?: string } | undefined)
          ?.slug,
      }
    },
  })

  if (!isCatalogRoute) {
    return <Outlet />
  }

  return (
    <AppCatalogLayout queryClient={queryClient} trpcClient={trpcClient}>
      <AppCatalogPage selectedSlug={selectedSlug} />
      {/*
        The catalog child routes render `null` -- the page above is theirs. The
        Outlet is still rendered so those matches stay mounted: that is what
        lets a child loader error / notFound propagate to the single app-wide
        error boundary (`errorComponent: RootErrorPage` in __root.tsx) and to
        `defaultNotFoundComponent`. Drop it and those states are swallowed with
        no error surface at all.
      */}
      <Outlet />
    </AppCatalogLayout>
  )
}
