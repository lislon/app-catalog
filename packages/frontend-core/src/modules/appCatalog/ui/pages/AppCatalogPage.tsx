import type { Resource } from '@igstack/app-catalog-backend-core'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo } from 'react'
import { useAppCatalogContext } from '../../context/AppCatalogContext'
import { useAppCatalogFilters } from '../context/AppCatalogFiltersContext'
import { AppCatalogGrid } from '../catalog/AppCatalogGrid'
import { AppDetailPanel } from '../catalog/AppDetailPanel'

export function AppCatalogPage({
  selectedSlug,
  selectedSubSlug: subPageSlug,
}: { selectedSlug?: string; selectedSubSlug?: string } = {}) {
  const { resources, isLoadingApps } = useAppCatalogContext()
  const { state: filterState, actions } = useAppCatalogFilters()
  const navigate = useNavigate()

  // Selected app comes from the route path (/app/<slug>); undefined = nothing open
  const selectedAppSlug = selectedSlug

  // Search value from context (module-scoped, see AppCatalogFiltersContext)
  const search = useSearch({ strict: false })

  // Two distinct states, deliberately on different parts of the URL:
  //  - `?sub=<slug>`             the parent's detail, singled out to one child
  //  - `/app/<slug>/sub/<child>` that child's OWN page, with its access chain
  // Clicking a matched sub-resource in the search results reaches the first;
  // clicking its name in the parent's table reaches the second.
  const highlightSubSlug = search.sub

  const handleSubClick = useCallback(
    (parentSlug: string, subSlug: string) => {
      void navigate({
        to: '/app/$slug',
        params: { slug: parentSlug },
        search: (prev) => ({ ...prev, sub: subSlug }),
      })
    },
    [navigate],
  )

  const handleBackToParent = useCallback(() => {
    // Leave the sub-resource's page for its parent's detail, keeping `?sub=` so
    // the row the user came from stays singled out — going "back" shouldn't
    // dump them into all forty-seven siblings.
    if (selectedAppSlug) {
      void navigate({
        to: '/app/$slug',
        params: { slug: selectedAppSlug },
        search: (prev) => ({ ...prev, sub: subPageSlug }),
      })
    }
  }, [navigate, selectedAppSlug, subPageSlug])

  const searchValue = filterState.searchValue
  const setSearchValue = actions.setSearchValue

  // Get root resources for display (children surface through search)
  const rootResources = useMemo(
    () => resources.filter((r) => !r.parentSlug),
    [resources],
  )

  // Dev-only skew warning: data arrived (resources > 0) but nothing is top-level
  // (rootResources === 0). That fingerprints a frontend/backend-core version skew
  // or a stale service worker — NOT a normal empty search/filter (those still have
  // rootResources). Guarded to dev so prod users never see it.
  useEffect(() => {
    if (
      import.meta.env.DEV &&
      !isLoadingApps &&
      resources.length > 0 &&
      rootResources.length === 0
    ) {
      console.warn(
        `[app-catalog] Loaded ${resources.length} resources but 0 are top-level — ` +
          `likely a frontend/backend-core version skew or a stale service worker. ` +
          `Check the version footer (be X / fe Y) and hard-reload.`,
      )
    }
  }, [isLoadingApps, resources.length, rootResources.length])

  // #22: alias → canonical redirect. When an app is renamed its old slug is
  // kept in `aliases[]`. If the URL slug matches no canonical slug but does
  // match some app's alias, redirect (replace) to that app's canonical slug so
  // old bookmarks resolve instead of showing a blank catalog. Guard on a real
  // canonical miss so we never fight the normal detail-open path. Note: this is
  // a client-side SPA redirect (replace), not an HTTP 301 — see #22.
  useEffect(() => {
    if (!selectedAppSlug || resources.length === 0) return
    const canonical = resources.some((r) => r.slug === selectedAppSlug)
    if (canonical) return
    const aliased = resources.find((r) => r.aliases?.includes(selectedAppSlug))
    if (aliased) {
      void navigate({
        to: '/app/$slug',
        params: { slug: aliased.slug },
        search: (prev) => prev,
        replace: true,
      })
    }
  }, [selectedAppSlug, resources, navigate])

  const handleAppClick = (app: Resource) => {
    void navigate({
      to: '/app/$slug',
      params: { slug: app.slug },
      search: (prev) => prev,
    })
  }

  const handleLaunch = (app: Resource) => {
    if (app.appUrl) window.open(app.appUrl, '_blank', 'noopener,noreferrer')
  }

  // The app whose detail card is open over the catalog backdrop.
  const selectedApp = useMemo(
    () =>
      selectedAppSlug
        ? (resources.find((r) => r.slug === selectedAppSlug) ?? null)
        : null,
    [selectedAppSlug, resources],
  )

  // …and the sub-resource whose OWN page is open (`/app/<slug>/sub/<child>`).
  // `?sub=` deliberately does NOT land here: that state stays on the parent's
  // detail with the child singled out in its table.
  const selectedSub = useMemo(() => {
    if (!subPageSlug || !selectedApp) return null
    return (
      resources.find(
        (r) => r.slug === subPageSlug && r.parentSlug === selectedApp.slug,
      ) ?? null
    )
  }, [subPageSlug, selectedApp, resources])

  // Total resource count for the "Browse all" label (respects ?deprecated=1)
  const totalAppsCount = useMemo(
    () =>
      filterState.showDeprecated
        ? rootResources.length
        : rootResources.filter((app) => !app.deprecated).length,
    [rootResources, filterState.showDeprecated],
  )

  if (isLoadingApps) {
    return <div className="py-6 text-muted-foreground">Loading…</div>
  }

  // The catalog is one persistent shell (#38): the discovery spine or, while
  // typing, the in-place results list — both handled inside AppCatalogGrid, so
  // searching never swaps containers and the hero never moves. It owns vertical
  // scroll (MainLayout is h-screen/overflow-hidden), and `scrollbar-gutter:
  // stable` reserves the track so a shorter results list doesn't shift the hero
  // sideways when the scrollbar disappears.
  return (
    <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-gutter:stable]">
      <AppCatalogGrid
        apps={rootResources.filter(
          (a) => filterState.showDeprecated || !a.deprecated,
        )}
        // All resources incl. children — so search matches sub-resources
        // (e.g. a cloud account) and surfaces their parent.
        allResources={resources}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onAppClick={handleAppClick}
        onSubClick={handleSubClick}
        onLaunch={handleLaunch}
        totalCount={totalAppsCount}
        detailOpen={selectedApp !== null}
        selectedSubSlug={highlightSubSlug}
      />
      {/* #38 item B: the detail as a card over the catalog backdrop. */}
      {selectedApp && (
        <AppDetailPanel
          app={selectedApp}
          subResource={selectedSub}
          onClose={() => void navigate({ to: '/' })}
          onAppClick={handleAppClick}
          onBackToParent={handleBackToParent}
        />
      )}
    </div>
  )
}
