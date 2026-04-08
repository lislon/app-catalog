import { useNavigate, useRouter, useSearch } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

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

  // Track whether we've initialized from URL
  const isInitializedRef = useRef(false)

  // Initialize state from URL on mount (once only)
  const [state, setState] = useState<T>(() => {
    const urlValue = (search as Record<string, unknown>)[key]
    if (urlValue !== undefined) {
      const decodedValue = decode ? decode(String(urlValue)) : (urlValue as T)
      isInitializedRef.current = true
      return decodedValue
    }
    return defaultValue
  })

  // Sync state to URL (async side effect)
  useEffect(() => {
    // Don't sync until after initialization
    if (!isInitializedRef.current) return

    // Encode state value for URL
    const encodedValue = encode ? encode(state) : (state as string | undefined)

    // Check if already in sync
    if (encodedValue === (search as Record<string, unknown>)[key]) return

    const currentPath = router.state.location.pathname
    navigate({
      to: currentPath,
      search: {
        ...search,
        [key]: encodedValue,
      },
      replace: true, // Use replace to avoid polluting history
    })
  }, [state, key, encode, navigate, router.state.location.pathname, search])

  return [state, setState]
}
