import type { ReactNode } from 'react'
import { createContext, use, useMemo } from 'react'
import { useUrlSyncedState } from '../../hooks/useUrlSyncedState'
import {
  SEARCH_STORAGE_KEY,
  useSessionSyncedState,
} from '../../hooks/useSessionSyncedState'

/**
 * Filter state
 */
export interface AppCatalogFiltersState {
  /** Search query value */
  searchValue: string
  /** Whether to show deprecated apps (default: false) */
  showDeprecated: boolean
}

/**
 * Filter actions
 */
export interface AppCatalogFiltersActions {
  /** Set search value */
  setSearchValue: (value: string) => void
  /** Set whether to show deprecated apps */
  setShowDeprecated: (show: boolean) => void
}

export interface AppCatalogFiltersContextValue {
  state: AppCatalogFiltersState
  actions: AppCatalogFiltersActions
}

const AppCatalogFiltersContext = createContext<
  AppCatalogFiltersContextValue | undefined
>(undefined)

interface AppCatalogFiltersProviderProps {
  children: ReactNode
}

export function AppCatalogFiltersProvider({
  children,
}: AppCatalogFiltersProviderProps) {
  // Search value lives in a module-scoped store (not the URL) so it survives the
  // per-route remount of this provider — e.g. auto-opening an app's detail page
  // when the query narrows to one match (#10) — WITHOUT leaking `?q=` into every
  // shared/bookmarked app link (#27), and without outliving the page load the way
  // sessionStorage did. The synchronous store read/write also removes the
  // effect-ordering race the URL sync had (#10).
  const [searchValue, setSearchValue] = useSessionSyncedState<string>({
    key: SEARCH_STORAGE_KEY,
    defaultValue: '',
  })

  const [showDeprecated, setShowDeprecated] = useUrlSyncedState({
    key: 'deprecated',
    defaultValue: false,
    decode: (value) => value === '1',
    encode: (value) => (value ? '1' : undefined),
  })

  const actions = useMemo<AppCatalogFiltersActions>(
    () => ({ setSearchValue, setShowDeprecated }),
    [setSearchValue, setShowDeprecated],
  )

  const contextValue = useMemo<AppCatalogFiltersContextValue>(
    () => ({
      state: { searchValue, showDeprecated },
      actions,
    }),
    [searchValue, showDeprecated, actions],
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
