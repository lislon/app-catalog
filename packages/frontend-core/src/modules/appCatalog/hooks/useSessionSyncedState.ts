import { useCallback, useState } from 'react'

/**
 * Options for useSessionSyncedState hook
 */
export interface UseSessionSyncedStateOptions<T> {
  /** The sessionStorage key */
  key: string
  /** Default value when the stored value is absent */
  defaultValue: T
  /** Optional decoder to transform the stored string to a state value */
  decode?: (storedValue: string) => T
  /** Optional encoder to transform the state value to a string (return undefined to clear) */
  encode?: (stateValue: T) => string | undefined
}

/**
 * Hook for state that persists in `sessionStorage` instead of the URL.
 *
 * Why this exists (see #27): the catalog search value used to be
 * synced to the URL (`?q=`) so it survived the per-route remount of
 * `AppCatalogFiltersProvider` (#10). But `q` leaked into every shared/bookmarked
 * app link. Backing the value with `sessionStorage` keeps the #10 guarantee —
 * the value survives the remount and the auto-navigate to a single match — while
 * keeping the URL clean.
 *
 * Key features vs {@link useUrlSyncedState}:
 * - Initializes synchronously from `sessionStorage` on mount.
 * - Writes synchronously in the setter (no async effect), which also removes the
 *   effect-ordering race #10 fought (a child auto-navigate effect could run
 *   before the provider's async state->URL sync).
 * - Never navigates, so it never touches the URL.
 *
 * Defensive against environments without a functional `sessionStorage`
 * (some CI jsdom setups) — falls back to plain in-memory state.
 */
export function useSessionSyncedState<T>({
  key,
  defaultValue,
  decode,
  encode,
}: UseSessionSyncedStateOptions<T>): [T, (value: T) => void] {
  const [state, setStateInternal] = useState<T>(() => {
    try {
      // The try/catch is the real guard against a missing/throwing
      // sessionStorage (SSR, locked-down jsdom); the access itself is typed
      // non-null, so no optional chaining is needed here.
      const stored = globalThis.sessionStorage.getItem(key)
      if (stored !== null) {
        return decode ? decode(stored) : (stored as T)
      }
    } catch {
      // sessionStorage unavailable — fall through to the default
    }
    return defaultValue
  })

  const setState = useCallback(
    (value: T) => {
      setStateInternal(value)
      try {
        const encoded = encode ? encode(value) : (value as string | undefined)
        if (encoded === undefined) {
          globalThis.sessionStorage.removeItem(key)
        } else {
          globalThis.sessionStorage.setItem(key, encoded)
        }
      } catch {
        // sessionStorage unavailable — state still works in-memory
      }
    },
    [key, encode],
  )

  return [state, setState]
}

/**
 * sessionStorage key backing the catalog search value (#27). Exported so tests
 * (and any tooling that needs to seed a "returning user" search) reference the
 * same key as the provider.
 */
export const SEARCH_STORAGE_KEY = 'app-catalog:search'
