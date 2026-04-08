import type { Resource } from '@igstack/app-catalog-backend-core'
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
import { useUrlSyncedState } from '../../hooks/useUrlSyncedState'
import { searchResources } from '../../utils/searchApps'
import { OnboardingCard } from '../components/OnboardingCard'
import { useAppCatalogFilters } from '../context/AppCatalogFiltersContext'
import { FilterBar } from '../filters/FilterBar'
import { AppCatalogGrid } from '../grid/AppCatalogGrid'

export function AppCatalogPage() {
  const { resources, isLoadingApps, tagsDefinitions } = useAppCatalogContext()
  const { state: filterState, actions } = useAppCatalogFilters()
  const { getTopApps } = useAppClickHistory()

  // URL-synced state
  const [selectedAppSlug, setSelectedAppSlug] = useUrlSyncedState<
    string | undefined
  >({
    key: 'app',
    defaultValue: undefined,
  })

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

  const filteredApps = useMemo(() => {
    let result = rootResources

    // Step 1: Filter deprecated apps (if not showing them)
    if (!filterState.showDeprecated) {
      result = result.filter((app) => !app.deprecated)
    }

    // Step 2: Apply recent mode or tag filters
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

    // Step 3: Apply search (using deferred value)
    // Pass all resources so children contribute to parent scoring
    const childResources = resources.filter((r) => r.parentSlug)
    result = searchResources(
      [...result, ...childResources],
      deferredSearchValue,
    )

    return result
  }, [
    rootResources,
    resources,
    deferredSearchValue,
    filterState.recentMode,
    filterState.tagFilters,
    filterState.showDeprecated,
    topAppSlugs,
  ])

  // Calculate counts for FilterBar
  const { allCount, recentCount, deprecatedCount } = useAppCounts({
    apps: rootResources,
    topAppSlugs,
    searchValue: deferredSearchValue,
  })

  // Auto-open details when only 1 result
  useEffect(() => {
    if (filteredApps.length === 1 && filteredApps[0]) {
      setSelectedAppSlug(filteredApps[0].slug)
    }
  }, [filteredApps, setSelectedAppSlug])

  const handleAppClick = (app: Resource) => {
    setSelectedAppSlug(app.slug)
  }

  const handleClearFilters = () => {
    setSearchValue('')
    actions.clearAllFilters()
    setSelectedAppSlug(undefined)
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

      <div className="flex-1 min-h-0">
        {filteredApps.length === 0 ? (
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
                    setSelectedAppSlug(undefined)
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
