import { useEffect, useState } from 'react'
import { Input } from '~/ui/input'
import { useAppCatalogContext } from '../../context/AppCatalogContext'
import { useAppClickHistory } from '../../hooks/useAppClickHistory'
import { useAppCounts } from '../../hooks/useAppCounts'
import { useUrlSyncedState } from '../../hooks/useUrlSyncedState'
import { FilterBar } from '../filters/FilterBar'

/**
 * Header component that renders search input and filter bar inline.
 * Manages its own URL-synced search state and calculates counts.
 */
export function SearchAndFilterHeader() {
  const { apps } = useAppCatalogContext()
  const { getTopApps } = useAppClickHistory()

  const [searchValue, setSearchValue] = useUrlSyncedState<string>({
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
    <div className="flex items-center gap-3 w-full">
      <Input
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        placeholder="Search apps..."
        aria-label="Search apps"
        className="max-w-sm"
      />
      <FilterBar totalCount={allCount} recentCount={recentCount} />
    </div>
  )
}
