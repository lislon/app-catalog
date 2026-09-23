import 'fake-indexeddb/auto'
import './polyfillLocalStorage'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { cleanupTestResources, takeUnhandledRequests } from '../harness/given'

// Mock scrollIntoView — not implemented in jsdom
Element.prototype.scrollIntoView = vi.fn()
// Mock window.scrollTo — not implemented in jsdom; the router's scroll restoration
// calls it on every navigation, and jsdom reports each call as an `Error:` (#119)
window.scrollTo = vi.fn()

// Clean up after each test
afterEach(async () => {
  cleanup()
  await cleanupTestResources()
  localStorage.clear()
  sessionStorage.clear()

  // A request nobody mocked means a component ran its error path while the test
  // asserted the happy one. Failing here, not warning, is what makes a missing
  // handler a red test instead of a line in the log (#119).
  const unhandled = takeUnhandledRequests()
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
} as unknown as typeof IntersectionObserver

// Mock ResizeObserver — required by embla-carousel ResizeHandler in jsdom
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver
