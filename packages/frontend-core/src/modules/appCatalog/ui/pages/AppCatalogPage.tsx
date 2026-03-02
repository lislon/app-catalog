import { useNavigate, useRouter, useSearch } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'

import type { AppForCatalog } from '@igstack/app-catalog-backend-core'
import { useAppCatalogContext } from '../../context/AppCatalogContext'
import { AppCatalogGrid } from '../grid/AppCatalogGrid'
import { searchApps } from '../../utils/searchApps'

import { Input } from '~/ui/input'

export function AppCatalogPage() {
  const navigate = useNavigate()
  const router = useRouter()
  const search = useSearch({ strict: false })
  const { apps, isLoadingApps, tagsDefinitions } = useAppCatalogContext()
  const [searchValue, setSearchValue] = useState('')

  // Local state for app selection (source of truth)
  const [selectedAppSlug, setSelectedAppSlug] = useState<string | undefined>()

  const filterTag = search.filterTag

  // Initialize from URL on mount (once only)
  const isInitializedRef = useRef(false)
  useEffect(() => {
    if (!isInitializedRef.current) {
      if (search.app) {
        setSelectedAppSlug(search.app)
      }
      if (search.q) {
        setSearchValue(search.q)
      }
      isInitializedRef.current = true
    }
  }, [search.app, search.q])

  // Sync app selection state to URL (async side effect)
  useEffect(() => {
    // Don't sync until after initialization
    if (!isInitializedRef.current) return
    if (selectedAppSlug === search.app) return // Already in sync

    const currentPath = router.state.location.pathname
    navigate({
      to: currentPath,
      search: { ...search, app: selectedAppSlug },
      replace: true, // Use replace to avoid polluting history
    })
  }, [selectedAppSlug, navigate, router.state.location.pathname, search])

  // Sync search value state to URL (async side effect)
  useEffect(() => {
    // Don't sync until after initialization
    if (!isInitializedRef.current) return

    const normalizedSearchValue = searchValue.trim()
    const urlSearchValue = search.q || ''

    if (normalizedSearchValue === urlSearchValue) return // Already in sync

    const currentPath = router.state.location.pathname
    navigate({
      to: currentPath,
      search: {
        ...search,
        q: normalizedSearchValue || undefined, // Remove param if empty
      },
      replace: true, // Use replace to avoid polluting history
    })
  }, [searchValue, navigate, router.state.location.pathname, search])

  const filteredApps = useMemo(() => {
    // First apply search with smart sorting
    const searchedApps = searchApps(apps, searchValue)

    // Then apply tag filter if present
    if (filterTag === undefined) {
      return searchedApps
    }

    return searchedApps.filter((app) =>
      app.tags?.some((tag) => tag.toLowerCase() === filterTag.toLowerCase()),
    )
  }, [apps, searchValue, filterTag])

  const handleAppClick = (app: AppForCatalog) => {
    setSelectedAppSlug(app.slug)
  }

  if (isLoadingApps) {
    return <div className="py-6 text-muted-foreground">Loading…</div>
  }

  // Use first tag definition for grouping
  const groupingDefinition = tagsDefinitions[0]

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="pb-4 shrink-0">
        <div className="w-full">
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search apps by name, description, or tags…"
            aria-label="Search apps"
          />
          <div className="text-sm text-muted-foreground p-1">
            {filteredApps.length} apps available
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <AppCatalogGrid
          apps={filteredApps}
          selectedAppSlug={selectedAppSlug}
          groupingDefinition={groupingDefinition}
          onAppClick={handleAppClick}
        />
      </div>
    </div>
  )
}
