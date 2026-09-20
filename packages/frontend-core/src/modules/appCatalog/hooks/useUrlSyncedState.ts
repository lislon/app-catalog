import { useNavigate, useRouter, useSearch } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

/**
 * Options for useUrlSyncedState hook
 */
export interface UseUrlSyncedStateOptions<T> {
  /** The URL search parameter key */
  key: string
  /** Default value when URL param is not present */
  defaultValue: T
  /** Optional decoder to transform URL string to state value */
  decode?: (urlValue: string) => T
  /** Optional encoder to transform state value to URL string (return undefined to remove param) */
  encode?: (stateValue: T) => string | undefined
}

/**
 * Hook for managing state that is synced bidirectionally with URL search params.
 *
 * Key features:
 * - Initializes from URL once on mount
 * - Async sync state → URL after initialization to prevent UI sluggishness
 * - Uses replace: true to avoid polluting browser history
 *
 * @example
 * ```tsx
 * // Boolean state
 * const [recentMode, setRecentMode] = useUrlSyncedState({
 *   key: 'recent',
 *   defaultValue: false,
 *   decode: (value) => value === '1',
 *   encode: (value) => value ? '1' : undefined,
 * })
 *
 * // Object state
 * const [filters, setFilters] = useUrlSyncedState({
 *   key: 'filters',
 *   defaultValue: {},
 *   decode: (value) => parseFilters(value),
 *   encode: (value) => encodeFilters(value),
 * })
 * ```
 */
export function useUrlSyncedState<T>({
  key,
  defaultValue,
  decode,
  encode,
}: UseUrlSyncedStateOptions<T>): [T, (value: T) => void] {
  const navigate = useNavigate()
  const router = useRouter()
  const search = useSearch({ strict: false })

  // Initialize state from URL on mount (once only)
  const [state, setState] = useState<T>(() => {
    const urlValue = (search as Record<string, unknown>)[key]
    if (urlValue !== undefined) {
      return decode ? decode(String(urlValue)) : (urlValue as T)
    }
    return defaultValue
  })

  // Sync state to URL (async side effect). The equality check below is what
  // prevents redundant writes / URL pollution from default values — so state
  // changes made from the default (e.g. the first keystroke in an empty search)
  // are still persisted to the URL and survive navigation/remounts.
  useEffect(() => {
    // Compare against the LIVE router location, not the `useSearch()` snapshot
    // above: that snapshot comes from the resolved route match and still holds
    // the pre-navigation params while a navigation this effect issued is
    // settling. `encode` is normally an inline arrow, so this effect re-runs on
    // every render — and against the stale snapshot the sync check never
    // matched, so each render queued another navigate() and each navigate()
    // caused another render. 50 of those is React's "Maximum update depth
    // exceeded", which unmounted the subtree mid-interaction (#152).
    //
    // Spreading the live params matters for the same reason: two instances of
    // this hook writing different keys in one tick would otherwise each spread
    // their own stale snapshot and drop the other's param.
    const currentSearch = router.state.location.search as Record<
      string,
      unknown
    >

    // Encode state value for URL
    const encodedValue = encode ? encode(state) : (state as string | undefined)

    // Check if already in sync
    if (encodedValue === currentSearch[key]) return

    navigate({
      to: router.state.location.pathname,
      search: {
        ...currentSearch,
        [key]: encodedValue,
      },
      replace: true, // Use replace to avoid polluting history
    })
    // `search` stays in the deps so an external URL change (back/forward) still
    // re-runs this and re-asserts state → URL.
  }, [state, key, encode, navigate, router, search])

  return [state, setState]
}
