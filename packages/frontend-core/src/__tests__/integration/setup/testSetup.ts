import 'fake-indexeddb/auto'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { cleanupTestResources } from '../harness/given'
import React from 'react'

// Mock SVG React component imports (vite-plugin-svgr ?react suffix)
vi.mock('~/assets/app-catalog.svg?react', () => ({
  default: (props: React.SVGProps<SVGSVGElement>) =>
    React.createElement('svg', { 'data-testid': 'svg-mock', ...props }),
}))

// Mock scrollIntoView — not implemented in jsdom
Element.prototype.scrollIntoView = vi.fn()

// Clean up after each test
afterEach(async () => {
  cleanup()
  await cleanupTestResources()
  localStorage.clear()
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
