import type { ReactNode } from 'react'
import { createContext, use, useMemo, useState } from 'react'
import { useAppCatalogContext } from '../../context/AppCatalogContext'
import { useUrlSyncedState } from '../../hooks/useUrlSyncedState'
import {
  decodeFiltersParam,
  encodeFiltersParam,
} from '../../utils/filterHelpers'

/**
 * Tag option for filter combobox
 */
export interface TagOption {
  /** Tag value (e.g., "communication") */
  value: string
  /** Full tag with prefix (e.g., "category:communication") */
  fullTag: string
  /** Display name for UI */
  displayName: string
  /** Description for UI */
  description: string
}

/**
 * Derived filter data computed from state and catalog
 */
export interface FilterData {
  /** Available tag options grouped by prefix */
  availableTagsByPrefix: Record<string, Array<TagOption>>
  /** Whether any filters are currently active */
  hasActiveFilters: boolean
}

/**
 * Filter state
 */
export interface AppCatalogFiltersState {
  /** Tag prefixes that can be filtered (from uiSettings) */
  filterableTagPrefixes: Array<string>
  /** Whether "My Recent" mode is active */
  recentMode: boolean
  /** Active tag filters (prefix -> value) */
  tagFilters: Record<string, string>
  /** Search query value */
  searchValue: string
  /** Whether to show deprecated apps (default: false) */
  showDeprecated: boolean
}

/**
 * Filter actions
 */
export interface AppCatalogFiltersActions {
  /** Enable/disable "My Recent" mode (clears tag filters when enabled) */
  setRecentMode: (enabled: boolean) => void
  /** Set a tag filter (clears recent mode) */
  setTagFilter: (prefix: string, value: string | undefined) => void
  /** Set search value */
  setSearchValue: (value: string) => void
  /** Set whether to show deprecated apps */
  setShowDeprecated: (show: boolean) => void
  /** Clear all filters (keeps search) */
  clearAllFilters: () => void
}

export interface AppCatalogFiltersContextValue {
  state: AppCatalogFiltersState
  data: FilterData
  actions: AppCatalogFiltersActions
}

const AppCatalogFiltersContext = createContext<
  AppCatalogFiltersContextValue | undefined
>(undefined)

interface AppCatalogFiltersProviderProps {
  children: ReactNode
  /** Tag prefixes that can be filtered (from uiSettings) */
  filterableTagPrefixes: Array<string>
}

export function AppCatalogFiltersProvider({
  children,
  filterableTagPrefixes,
}: AppCatalogFiltersProviderProps) {
  const { tagsDefinitions } = useAppCatalogContext()

  // URL-synced state
  const [recentMode, setRecentMode] = useUrlSyncedState({
    key: 'recent',
    defaultValue: false,
    decode: (value) => value === '1',
    encode: (value) => (value ? '1' : undefined),
  })

  const [tagFilters, setTagFilters] = useUrlSyncedState({
    key: 'filters',
    defaultValue: {},
    decode: decodeFiltersParam,
    encode: encodeFiltersParam,
  })

  // Search value is NOT synced to URL
  const [searchValue, setSearchValue] = useState<string>('')

  const [showDeprecated, setShowDeprecated] = useUrlSyncedState({
    key: 'deprecated',
    defaultValue: false,
    decode: (value) => value === '1',
    encode: (value) => (value ? '1' : undefined),
  })

  // Compute available tags by prefix
  const availableTagsByPrefix = useMemo(() => {
    const result: Record<string, Array<TagOption>> = {}

    filterableTagPrefixes.forEach((prefix) => {
      const definition = tagsDefinitions.find((def) => def.prefix === prefix)
      if (definition) {
        result[prefix] = definition.values.map((tagValue) => ({
          value: tagValue.value,
          fullTag: `${prefix}:${tagValue.value}`,
          displayName: tagValue.displayName,
          description: tagValue.description,
        }))
      }
    })

    return result
  }, [filterableTagPrefixes, tagsDefinitions])

  // Compute whether any filters are active
  const hasActiveFilters = useMemo(() => {
    return recentMode || Object.keys(tagFilters).length > 0
  }, [recentMode, tagFilters])

  // Actions
  const actions = useMemo<AppCatalogFiltersActions>(
    () => ({
      setRecentMode: (enabled: boolean) => {
        // Always clear tag filters when changing mode
        setTagFilters({})
        setRecentMode(enabled)
      },
      setTagFilter: (prefix: string, value: string | undefined) => {
        // Clear recent mode when setting tag filter
        if (value !== undefined) {
          setRecentMode(false)
        }

        // Update tag filters
        if (value === undefined) {
          // Remove filter
          const { [prefix]: _, ...rest } = tagFilters
          setTagFilters(rest)
        } else {
          // Add/update filter
          setTagFilters({ ...tagFilters, [prefix]: value })
        }
      },
      setSearchValue,
      setShowDeprecated,
      clearAllFilters: () => {
        setRecentMode(false)
        setTagFilters({})
      },
    }),
    [
      setRecentMode,
      setTagFilters,
      tagFilters,
      setSearchValue,
      setShowDeprecated,
    ],
  )

  const contextValue = useMemo<AppCatalogFiltersContextValue>(
    () => ({
      state: {
        filterableTagPrefixes,
        recentMode,
        tagFilters,
        searchValue,
        showDeprecated,
      },
      data: {
        availableTagsByPrefix,
        hasActiveFilters,
      },
      actions,
    }),
    [
      filterableTagPrefixes,
      recentMode,
      tagFilters,
      searchValue,
      showDeprecated,
      availableTagsByPrefix,
      hasActiveFilters,
      actions,
    ],
  )

  return (
    <AppCatalogFiltersContext value={contextValue}>
      {children}
    </AppCatalogFiltersContext>
  )
}

export function useAppCatalogFilters(): AppCatalogFiltersContextValue {
  const context = use(AppCatalogFiltersContext)
  if (!context) {
    throw new Error(
      'useAppCatalogFilters must be used within AppCatalogFiltersProvider',
    )
  }
  return context
}
