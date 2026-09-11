/**
 * Polyfill localStorage for jsdom environments where it's missing or incomplete.
 *
 * jsdom only provides localStorage when initialized with a valid URL (not about:blank).
 * Even with environmentOptions.jsdom.url set, some CI environments (GitHub Actions)
 * still don't provide a fully functional localStorage. This polyfill ensures it works.
 */
if (
  typeof globalThis.localStorage === 'undefined' ||
  typeof globalThis.localStorage.clear !== 'function'
) {
  const store = new Map<string, string>()
  const storage: Storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
    get length() {
      return store.size
    },
    key: (index: number) => [...store.keys()][index] ?? null,
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    writable: true,
    configurable: true,
  })
}
