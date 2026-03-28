import { useMemo } from 'react'
import type { AppForCatalog } from '@igstack/app-catalog-backend-core'
import { searchApps } from '../utils/searchApps'
import { useAppCatalogFilters } from '../ui/context/AppCatalogFiltersContext'

interface UseAppCountsOptions {
  apps: AppForCatalog[]
  topAppSlugs: string[]
  searchValue: string
}

/**
 * Calculates filtered app counts for display in FilterBar.
 * Counts include search filter applied.
 */
export function useAppCounts({
  apps,
  topAppSlugs,
  searchValue,
}: UseAppCountsOptions) {
  const { state: filterState } = useAppCatalogFilters()

  // Count of deprecated apps (total, no filters applied)
  const deprecatedCount = useMemo(() => {
    return apps.filter((app) => app.deprecated).length
  }, [apps])

  // Count for "My Recent" (with search applied, respects showDeprecated)
  const recentCount = useMemo(() => {
    let recentApps = apps.filter((app) => topAppSlugs.includes(app.slug))
    if (!filterState.showDeprecated) {
      recentApps = recentApps.filter((app) => !app.deprecated)
    }
    return searchApps(recentApps, searchValue).length
  }, [apps, topAppSlugs, searchValue, filterState.showDeprecated])

  // Count for "Show All" (respects showDeprecated, tag filters, and search)
  const allCount = useMemo(() => {
    let result = apps

    // Apply deprecated filter
    if (!filterState.showDeprecated) {
      result = result.filter((app) => !app.deprecated)
    }

    // Apply tag filters if any
    if (Object.keys(filterState.tagFilters).length > 0) {
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

    return searchApps(result, searchValue).length
  }, [apps, filterState.tagFilters, filterState.showDeprecated, searchValue])

  return { recentCount, allCount, deprecatedCount }
}
