import { useEffect, useState } from 'react'
import { useAppCatalogContext } from '../../context/AppCatalogContext'
import { useAppClickHistory } from '../../hooks/useAppClickHistory'
import { useAppCounts } from '../../hooks/useAppCounts'
import { useUrlSyncedState } from '../../hooks/useUrlSyncedState'
import { FilterBar } from '../filters/FilterBar'

/**
 * Header component that renders filter bar aligned to the right.
 * Calculates counts based on URL-synced search state.
 */
export function SearchAndFilterHeader() {
  const { apps } = useAppCatalogContext()
  const { getTopApps } = useAppClickHistory()

  const [searchValue] = useUrlSyncedState<string>({
    key: 'q',
    defaultValue: '',
    encode: (value) => value.trim() || undefined,
  })

  const [topAppSlugs, setTopAppSlugs] = useState<Array<string>>([])

  // Load top apps on mount
  useEffect(() => {
    void getTopApps(10).then(setTopAppSlugs)
  }, [getTopApps])

  const { allCount, recentCount } = useAppCounts({
    apps,
    topAppSlugs,
    searchValue,
  })

  return (
    <div className="flex items-center gap-3 ml-auto">
      <FilterBar totalCount={allCount} recentCount={recentCount} />
    </div>
  )
}
