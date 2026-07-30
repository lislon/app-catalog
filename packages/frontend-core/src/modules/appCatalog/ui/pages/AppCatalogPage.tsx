import type { Resource } from '@igstack/app-catalog-backend-core'
import { useNavigate } from '@tanstack/react-router'
import { X } from 'lucide-react'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
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

  // #11: when the search fell back to deprecated results, enable the
  // "Show Deprecated Apps" toggle so the state is visible and consistent.
  // Runs as an effect (not in render) to avoid a side effect during useMemo.
  useEffect(() => {
    if (didDeprecatedFallback && !filterState.showDeprecated) {
      actions.setShowDeprecated(true)
    }
  }, [didDeprecatedFallback, filterState.showDeprecated, actions])

  // Calculate counts for FilterBar
  const { allCount, recentCount, deprecatedCount } = useAppCounts({
    apps: rootResources,
    topAppSlugs,
    searchValue: deferredSearchValue,
  })

  // Auto-open details when only 1 result. Carry the *current* search value into
  // the URL (`q`) as part of this navigation so the search input and focus
  // survive the route change (#10). We must inject `searchValue` explicitly
  // rather than rely on `(prev) => prev`: this child effect runs before the
  // provider's async state→URL sync effect, so at nav time the URL does not yet
  // hold `q` and the query would otherwise be lost on remount.
  useEffect(() => {
    if (filteredApps.length === 1 && filteredApps[0] && !selectedAppSlug) {
      void navigate({
        to: '/app/$slug',
        params: { slug: filteredApps[0].slug },
        search: (prev) => ({
          ...prev,
          q: searchValue === '' ? undefined : searchValue,
        }),
        replace: true,
      })
    }
  }, [filteredApps, selectedAppSlug, navigate, searchValue])

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

  return (
    <div className="flex flex-col flex-1 min-h-0">
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
            groupingDefinition={groupingDefinition}
            onAppClick={handleAppClick}
            onClosePanel={() => void navigate({ to: '/' })}
            hasSearch={!!deferredSearchValue}
            searchQuery={deferredSearchValue}
            totalAppsCount={totalAppsCount}
            onClearFilters={handleClearFilters}
          />
        )}
      </div>
    </div>
  )
}
