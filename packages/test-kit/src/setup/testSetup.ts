import 'fake-indexeddb/auto'
import './polyfillLocalStorage'
import { afterEach, vi } from 'vitest'
import { cleanup, configure } from '@testing-library/react'
import { cleanupTestResources, takeUnhandledRequests } from '../harness/given'

// The detail card is a lazy chunk (#120): opening it the first time transforms
// its module graph on demand, which outlasts the 1s default under a parallel run.
configure({ asyncUtilTimeout: 5000 })

// Mock scrollIntoView — not implemented in jsdom
Element.prototype.scrollIntoView = vi.fn()
// Mock window.scrollTo — not implemented in jsdom; the router's scroll restoration
// calls it on every navigation, and jsdom reports each call as an `Error:` (#119)
window.scrollTo = vi.fn()

// Clean up after each test
afterEach(async () => {
  // The record is module-scoped, so it has to be drained even when cleanup fails:
  // otherwise a throwing cleanup (a Dexie delete on a closing connection) leaves
  // this test's requests in the array and fails the NEXT test with them.
  let cleanupError: unknown
  try {
    cleanup()
    await cleanupTestResources()
    localStorage.clear()
    sessionStorage.clear()
  } catch (error) {
    cleanupError = error
  }

  const unhandled = takeUnhandledRequests()

  // A broken teardown is the more fundamental failure, so it wins the report.
  if (cleanupError) throw cleanupError

  // A request nobody mocked means a component ran its error path while the test
  // asserted the happy one. Failing here, not warning, is what makes a missing
  // handler a red test instead of a line in the log (#119).
  if (unhandled.length > 0) {
    throw new Error(
      `The mock network had no handler for:\n  ${unhandled.join('\n  ')}\n` +
        'Add one to SharedNetwork / makeNetworkReplyWithCatalog, or override it in the magazine.',
    )
  }
})

// Mock window.matchMedia — required by embla-carousel in jsdom environment
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

// Mock IntersectionObserver — required by embla-carousel SlidesInView in jsdom
globalThis.IntersectionObserver = class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
  readonly root = null
  readonly rootMargin = ''
  readonly thresholds = []
}

// Mock ResizeObserver — required by embla-carousel ResizeHandler in jsdom
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
