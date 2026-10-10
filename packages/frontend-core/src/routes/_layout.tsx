import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { AppCatalogLayout } from '~/modules/appCatalog/ui/layout/AppCatalogLayout'
import { AppCatalogPage } from '~/modules/appCatalog/ui/pages/AppCatalogPage'
// Route ids are read off the route objects instead of being spelled out as
// string literals: renaming/moving either file is then a compile error here
// rather than a silently non-matching id at runtime. `Route.id` is only
// populated once the router builds the tree, so it must be read at render
// time (inside the selector), never at module scope.
import { Route as AppDetailRoute } from './_layout/app.$slug'
import { Route as SubResourceDetailRoute } from './_layout/app.$slug_.sub.$subSlug'
import { Route as CatalogIndexRoute } from './_layout/index'

/**
 * The opt-in a deployment's own route sets to get the catalog layout:
 *
 *   createFileRoute('/_layout/app/$slug_/whatever')({
 *     staticData: { acCatalogLayout: true },
 *     component: MyRoute,
 *   })
 *
 * Narrowed rather than asserted: `staticData` is a loose bag that a consumer
 * fills, so an unexpected shape must read as "not opted in" instead of
 * throwing inside a router-state selector.
 */
function wantsCatalogLayout(staticData: unknown): boolean {
  return (
    typeof staticData === 'object' &&
    staticData !== null &&
    'acCatalogLayout' in staticData &&
    staticData.acCatalogLayout === true
  )
}

function hasSlug(params: unknown): params is { slug: string } {
  return (
    typeof params === 'object' &&
    params !== null &&
    'slug' in params &&
    typeof params.slug === 'string'
  )
}

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
  const { isCatalogRoute, selectedSlug, selectedSubSlug } = useRouterState({
    select: (s) => {
      const detailMatch = s.matches.find((m) => m.routeId === AppDetailRoute.id)
      const subMatch = s.matches.find(
        (m) => m.routeId === SubResourceDetailRoute.id,
      )
      const params = (detailMatch ?? subMatch)?.params as
        | { slug?: string; subSlug?: string }
        | undefined
      // A deployment composing its own route tree can put a route inside this
      // layout, and it will not be one of the ids above — so without an opt-in
      // it silently renders outside AppCatalogLayout with no providers, and
      // the first hook that needs the catalog throws. `staticData` is the
      // opt-in: the route declares that it wants the catalog layout, and the
      // core needs to know nothing about it.
      const optedIn = s.matches.some(
        (m) => wantsCatalogLayout(m.staticData) === true,
      )
      // The slug from whichever match carries one, so a deployment's own route
      // under /app/$slug/... opens the card it belongs to rather than dropping
      // the user on the catalog index.
      const slugMatch = [...s.matches].reverse().find((m) => hasSlug(m.params))
      // One narrowing is enough: the predicate on `find` already guarantees the
      // match it returned carries a string slug.
      const consumerSlug = hasSlug(slugMatch?.params)
        ? slugMatch.params.slug
        : undefined

      return {
        isCatalogRoute:
          detailMatch !== undefined ||
          subMatch !== undefined ||
          optedIn ||
          s.matches.some((m) => m.routeId === CatalogIndexRoute.id),
        selectedSlug: params?.slug ?? consumerSlug,
        selectedSubSlug: params?.subSlug,
      }
    },
  })

  if (!isCatalogRoute) {
    return <Outlet />
  }

  return (
    <AppCatalogLayout queryClient={queryClient} trpcClient={trpcClient}>
      <AppCatalogPage
        selectedSlug={selectedSlug}
        selectedSubSlug={selectedSubSlug}
      />
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
