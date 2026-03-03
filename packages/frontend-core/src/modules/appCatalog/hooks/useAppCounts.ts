import { useMemo } from 'react'
import type { AppForCatalog } from '@igstack/app-catalog-backend-core'
import { searchApps } from '../utils/searchApps'
import { useAppCatalogFilters } from '../ui/context/AppCatalogFiltersContext'

interface UseAppCountsOptions {
  apps: Array<AppForCatalog>
  topAppSlugs: Array<string>
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

  // Count for "My Recent" (with search applied)
  const recentCount = useMemo(() => {
    const recentApps = apps.filter((app) => topAppSlugs.includes(app.slug))
    return searchApps(recentApps, searchValue).length
  }, [apps, topAppSlugs, searchValue])

  // Count for "Show All" (with tag filters and search applied, but not recent mode)
  const allCount = useMemo(() => {
    let result = apps

    // Apply tag filters if any
    if (Object.keys(filterState.tagFilters).length > 0) {
      result = apps.filter((app) => {
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
  }, [apps, filterState.tagFilters, searchValue])

  return { recentCount, allCount }
}
