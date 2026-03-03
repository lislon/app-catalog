import { useDeferredValue, useEffect, useState } from 'react'
import { useAppCatalogContext } from '../../context/AppCatalogContext'
import { useAppClickHistory } from '../../hooks/useAppClickHistory'
import { useAppCounts } from '../../hooks/useAppCounts'
import { useAppCatalogFilters } from '../context/AppCatalogFiltersContext'
import { FilterBar } from '../filters/FilterBar'

/**
 * Header component that renders filter bar aligned to the right.
 * Calculates counts based on URL-synced search state from context.
 * Uses deferred search value to avoid blocking the input.
 */
export function SearchAndFilterHeader() {
  const { apps } = useAppCatalogContext()
  const { getTopApps } = useAppClickHistory()
  const { state } = useAppCatalogFilters()

  // Defer search value for count calculations
  const searchValue = useDeferredValue(state.searchValue)

  const [topAppSlugs, setTopAppSlugs] = useState<Array<string>>([])

  // Load top apps on mount
  useEffect(() => {
    void getTopApps(10).then(setTopAppSlugs)
  }, [getTopApps])

  const { allCount, recentCount, deprecatedCount } = useAppCounts({
    apps,
    topAppSlugs,
    searchValue,
  })

  return (
    <div className="flex items-center gap-3 ml-auto">
      <FilterBar
        totalCount={allCount}
        recentCount={recentCount}
        deprecatedCount={deprecatedCount}
        apps={apps}
      />
    </div>
  )
}
