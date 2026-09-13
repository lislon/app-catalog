import { useCallback, useState } from 'react'

/**
 * Options for useSessionSyncedState hook
 */
export interface UseSessionSyncedStateOptions<T> {
  /** The store key */
  key: string
  /** Default value when the stored value is absent */
  defaultValue: T
}

// The store. Module scope is the point: it outlives a component remount and
// dies with the document, which is exactly the lifetime wanted here.
const store = new Map<string, unknown>()

/**
 * Hook for state that survives this provider's remount without touching the URL.
 *
 * Why this exists (see #27): the catalog search value used to be synced to the
 * URL (`?q=`) so it survived the per-route remount of
 * `AppCatalogFiltersProvider` (#10). But `q` leaked into every shared/bookmarked
 * app link. Backing the value with a module-scoped store keeps the #10
 * guarantee — the value survives the remount and the auto-navigate to a single
 * match — while keeping the URL clean.
 *
 * Not `sessionStorage`: that also survives a page reload, so a query typed
 * before lunch came back on the next load, silently filtering the whole catalog
 * with a search box the user never filled in.
 *
 * Key features vs {@link useUrlSyncedState}:
 * - Initializes synchronously on mount.
 * - Writes synchronously in the setter (no async effect), which also removes the
 *   effect-ordering race #10 fought (a child auto-navigate effect could run
 *   before the provider's async state->URL sync).
 * - Never navigates, so it never touches the URL.
 */
export function useSessionSyncedState<T>({
  key,
  defaultValue,
}: UseSessionSyncedStateOptions<T>): [T, (value: T) => void] {
  const [state, setStateInternal] = useState<T>(
    () => (store.get(key) as T | undefined) ?? defaultValue,
  )

  const setState = useCallback(
    (value: T) => {
      setStateInternal(value)
      store.set(key, value)
    },
    [key],
  )

  return [state, setState]
}

/**
 * Key backing the catalog search value (#27). Exported so tests (and any tooling
 * that needs to seed a "returning user" search) reference the same key as the
 * provider.
 */
export const SEARCH_STORAGE_KEY = 'app-catalog:search'

/** Seed a value as if the user had already set it this page load (tests). */
export function seedSessionState(key: string, value: unknown): void {
  store.set(key, value)
}

/** Drop all seeded/typed values — the per-test reset of a page reload. */
export function clearSessionState(): void {
  store.clear()
}
