import type { Resource } from '@igstack/app-catalog-backend-core'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { X } from 'lucide-react'
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Button } from '~/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '~/ui/empty'
import { useAppCatalogContext } from '../../context/AppCatalogContext'
import { useAppClickHistory } from '../../hooks/useAppClickHistory'
import { useAppCounts } from '../../hooks/useAppCounts'
import { searchResources } from '../../utils/searchApps'
import { OnboardingCard } from '../components/OnboardingCard'
import { useAppCatalogFilters } from '../context/AppCatalogFiltersContext'
import { FilterBar } from '../filters/FilterBar'
import { AppCatalogGrid } from '../grid/AppCatalogGrid'
import { LauncherHome } from '../launcher/LauncherHome'
import { LauncherDetailPanel } from '../launcher/LauncherDetailPanel'

export function AppCatalogPage({
  selectedSlug,
}: { selectedSlug?: string } = {}) {
  const { resources, isLoadingApps, tagsDefinitions } = useAppCatalogContext()
  const { state: filterState, actions } = useAppCatalogFilters()
  const { getTopApps } = useAppClickHistory()
  const navigate = useNavigate()

  // Selected app comes from the route path (/app/<slug>); undefined = nothing open
  const selectedAppSlug = selectedSlug

  // Search value from context (URL-synced in AppCatalogFiltersContext)
  const search = useSearch({ strict: false })
  const selectedSubSlug = search.sub

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
    // Return to parent app detail, clearing the sub-resource selection.
    // selectedAppSlug is the parent slug (set by the /app/$slug route).
    if (selectedAppSlug) {
      void navigate({
        to: '/app/$slug',
        params: { slug: selectedAppSlug },
        search: (prev) => {
          const { sub: _sub, ...rest } = prev as Record<string, string>
          return rest
        },
      })
    }
  }, [navigate, selectedAppSlug])

  const searchValue = filterState.searchValue
  const setSearchValue = actions.setSearchValue

  // Defer the search value used for filtering to avoid blocking the input
  const deferredSearchValue = useDeferredValue(searchValue)

  // State for top apps (loaded async)
  const [topAppSlugs, setTopAppSlugs] = useState<string[]>([])

  // Load top apps on mount to calculate recent count
  useEffect(() => {
    void getTopApps(10).then(setTopAppSlugs)
  }, [getTopApps])

  // Get root resources for filtering (children handled internally by searchResources)
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

  const { filteredApps, didDeprecatedFallback } = useMemo(() => {
    const childResources = resources.filter((r) => r.parentSlug)

    // Apply recent mode / tag filters / search over a base set of root apps.
    const runPipeline = (base: typeof rootResources) => {
      let result = base

      // Apply recent mode or tag filters
      if (filterState.recentMode) {
        // Filter to top 10 most clicked apps
        result = result.filter((app) => topAppSlugs.includes(app.slug))
      } else if (Object.keys(filterState.tagFilters).length > 0) {
        // Apply tag filters (AND condition)
        result = result.filter((app) => {
          return Object.entries(filterState.tagFilters).every(
            ([prefix, value]) => {
              const fullTag = `${prefix}:${value}`
              return app.tags?.some(
                (tag) => tag.toLowerCase() === fullTag.toLowerCase(),
              )
            },
          )
        })
      }

      // Apply search (using deferred value). Pass all resources so children
      // contribute to parent scoring.
      return searchResources(
        [...result, ...childResources],
        deferredSearchValue,
      )
    }

    // Matches among non-deprecated ("active") apps only.
    const activeMatches = runPipeline(
      rootResources.filter((app) => !app.deprecated),
    )

    // #11: derive the fallback purely from the data (not the toggle), so it
    // stays stable after the toggle auto-enables below — otherwise the notice
    // would flicker off as soon as showDeprecated flips to true.
    // Fallback applies when there's a query, no active matches, but deprecated
    // apps DO match.
    const hasQuery = deferredSearchValue.trim() !== ''
    if (hasQuery && activeMatches.length === 0) {
      const allMatches = runPipeline(rootResources)
      if (allMatches.length > 0) {
        return { filteredApps: allMatches, didDeprecatedFallback: true }
      }
    }

    // Normal display: include deprecated only when the toggle is on.
    const result = filterState.showDeprecated
      ? runPipeline(rootResources)
      : activeMatches
    return { filteredApps: result, didDeprecatedFallback: false }
  }, [
    rootResources,
    resources,
    deferredSearchValue,
    filterState.recentMode,
    filterState.tagFilters,
    filterState.showDeprecated,
    topAppSlugs,
  ])

  // The legacy grid + split-pane only renders for the structural filter views.
  // Search is handled by the launcher, so anything that reasons about the grid's
  // filter controls must be gated on this.
  const legacyGridActive =
    filterState.recentMode || Object.keys(filterState.tagFilters).length > 0

  // #11: when the search fell back to deprecated results, enable the
  // "Show Deprecated Apps" toggle so the state is visible and consistent.
  // Runs as an effect (not in render) to avoid a side effect during useMemo.
  // Grid-only: in the launcher that checkbox isn't rendered, so flipping it
  // would silently (and permanently) leak deprecated apps into Browse-all with
  // no visible control to undo it. The launcher labels the fallback itself.
  useEffect(() => {
    if (
      legacyGridActive &&
      didDeprecatedFallback &&
      !filterState.showDeprecated
    ) {
      actions.setShowDeprecated(true)
    }
  }, [
    legacyGridActive,
    didDeprecatedFallback,
    filterState.showDeprecated,
    actions,
  ])

  // Calculate counts for FilterBar
  const { allCount, recentCount, deprecatedCount } = useAppCounts({
    apps: rootResources,
    topAppSlugs,
    searchValue: deferredSearchValue,
  })

  // Auto-open details when only 1 result — ONLY in the legacy grid path
  // (recent/tag filters active). In the launcher (#38) typing shows the
  // in-place results list; auto-navigating to /app/<slug> on a single
  // match would yank the user out of the launcher into the old grid+panel
  // (reported bug: searching "biom" jumped straight to an app-detail page).
  // The results list already renders the single match as a keyboard-selectable
  // row — the user presses ↵ or clicks to open it.
  useEffect(() => {
    if (
      legacyGridActive &&
      filteredApps.length === 1 &&
      filteredApps[0] &&
      !selectedAppSlug
    ) {
      void navigate({
        to: '/app/$slug',
        params: { slug: filteredApps[0].slug },
        search: (prev) => prev,
        replace: true,
      })
    }
  }, [legacyGridActive, filteredApps, selectedAppSlug, navigate])

  // #22: alias → canonical redirect. When an app is renamed its old slug is
  // kept in `aliases[]`. If the URL slug matches no canonical slug but does
  // match some app's alias, redirect (replace) to that app's canonical slug so
  // old bookmarks resolve instead of showing a blank catalog. Guard on a real
  // canonical miss so we never fight the normal detail-open path. Note: this is
  // a client-side SPA redirect (replace), not an HTTP 301 — see ig-umbrella#22.
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

  // Adaptive-home launcher (#38): the persistent shell for browsing, searching
  // AND an open app detail. Search must NOT switch containers — typing used to
  // swap the centered launcher for the wide grid (new search bar, tabs, category
  // dropdown, deprecated checkbox), so the whole page jumped on the first
  // keystroke. The launcher now renders its results list below the (unmoved)
  // hero search box, and the legacy grid+split-pane is left only for the
  // structural filter views — recentMode and tag filters — where those filter
  // controls are the point. A selected app renders in an overlay above whichever
  // view is active (#38 item B). The grid is wrapped in the same centered
  // max-width so the two layouts stay visually consistent.
  const showLauncherHome =
    !filterState.recentMode && Object.keys(filterState.tagFilters).length === 0

  // The app whose detail slide-over is open over the launcher backdrop.
  const launcherSelectedApp = useMemo(
    () =>
      selectedAppSlug
        ? (resources.find((r) => r.slug === selectedAppSlug) ?? null)
        : null,
    [selectedAppSlug, resources],
  )

  // …and the sub-resource within it, when the URL carries `?sub=` (e.g. the user
  // clicked a matched sub-resource row in the search results).
  const launcherSelectedSub = useMemo(() => {
    if (!selectedSubSlug || !launcherSelectedApp) return null
    return (
      resources.find(
        (r) =>
          r.slug === selectedSubSlug &&
          r.parentSlug === launcherSelectedApp.slug,
      ) ?? null
    )
  }, [selectedSubSlug, launcherSelectedApp, resources])

  const handleClearFilters = () => {
    setSearchValue('')
    actions.clearAllFilters()
    void navigate({ to: '/' })
  }

  // Calculate total apps count (respecting showDeprecated setting)
  const totalAppsCount = useMemo(() => {
    let count = rootResources.length
    if (!filterState.showDeprecated) {
      count = rootResources.filter((app) => !app.deprecated).length
    }
    return count
  }, [rootResources, filterState.showDeprecated])

  if (isLoadingApps) {
    return <div className="py-6 text-muted-foreground">Loading…</div>
  }

  // Use first tag definition for grouping
  const groupingDefinition = tagsDefinitions[0]

  // Adaptive-home launcher view (#38): the discovery spine or, while typing, the
  // in-place results list (both handled inside LauncherHome). Owns vertical
  // scroll — MainLayout is h-screen/overflow-hidden, so the launcher must scroll
  // internally to reveal the full Browse-all list as the user scrolls.
  // `scrollbar-gutter: stable` reserves the scrollbar track so the shorter
  // results list doesn't shift the hero sideways when the scrollbar disappears.
  if (showLauncherHome) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-gutter:stable]">
        <LauncherHome
          apps={rootResources.filter(
            (a) => filterState.showDeprecated || !a.deprecated,
          )}
          // All resources incl. children — so search matches sub-resources
          // (e.g. an AWS account) and surfaces their parent, preserving the
          // existing cross-sub-resource search behavior.
          allResources={resources}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          onAppClick={handleAppClick}
          onSubClick={handleSubClick}
          onLaunch={handleLaunch}
          totalCount={totalAppsCount}
          detailOpen={launcherSelectedApp !== null}
          selectedSubSlug={selectedSubSlug}
        />
        {/* #38 item B: app detail as a slide-over over the launcher backdrop,
            instead of dropping into the old grid + split-pane. */}
        {launcherSelectedApp && (
          <LauncherDetailPanel
            app={launcherSelectedApp}
            subResource={launcherSelectedSub}
            onClose={() => void navigate({ to: '/' })}
            onAppClick={handleAppClick}
            onBackToParent={handleBackToParent}
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="w-full max-w-[1000px] mx-auto flex flex-col flex-1 min-h-0">
        <div className="shrink-0">
          <OnboardingCard />
        </div>

        <div className="shrink-0">
          <FilterBar
            totalCount={allCount}
            recentCount={recentCount}
            deprecatedCount={deprecatedCount}
            apps={rootResources}
          />
        </div>

        {didDeprecatedFallback && (
          <div
            role="status"
            className="shrink-0 px-1 pb-2 text-sm text-muted-foreground"
          >
            {`No active apps${
              searchValue ? ` for "${searchValue}"` : ''
            } — showing deprecated matches.`}
          </div>
        )}

        <div className="flex-1 min-h-0">
          {filteredApps.length === 0 && !selectedAppSlug ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <X className="h-6 w-6" />
                </EmptyMedia>
                <EmptyTitle>
                  No apps found{searchValue && ` for "${searchValue}"`}
                </EmptyTitle>
                <EmptyDescription>
                  Try adjusting your search or filters
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                {searchValue && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchValue('')
                      void navigate({ to: '/' })
                    }}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Clear search
                  </Button>
                )}
              </EmptyContent>
            </Empty>
          ) : (
            <AppCatalogGrid
              apps={filteredApps}
              selectedAppSlug={selectedAppSlug}
              selectedSubSlug={selectedSubSlug}
              groupingDefinition={groupingDefinition}
              onAppClick={handleAppClick}
              onClosePanel={() => void navigate({ to: '/' })}
              onSubClick={handleSubClick}
              onBackToParent={handleBackToParent}
              hasSearch={!!deferredSearchValue}
              searchQuery={searchValue}
              totalAppsCount={totalAppsCount}
              onClearFilters={handleClearFilters}
            />
          )}
        </div>
      </div>
    </div>
  )
}
