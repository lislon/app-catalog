import { afterEach } from 'vitest'

const globalPatterns: RegExp[] = []
let testPatterns: RegExp[] = []

const originals = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug.bind(console),
}

function isSuppressed(args: unknown[]): boolean {
  const all = [...globalPatterns, ...testPatterns]
  if (all.length === 0) return false
  const text = args.map(String).join(' ')
  return all.some((p) => p.test(text))
}

let installed = false

function installOnce() {
  if (installed) return
  installed = true

  for (const method of ['log', 'warn', 'error', 'debug'] as const) {
    const original = originals[method]
    console[method] = (...args: unknown[]) => {
      if (!isSuppressed(args)) original(...args)
    }
  }

  // Auto-clear test-scoped patterns after each test (global patterns persist)
  afterEach(() => {
    testPatterns = []
  })
}

/**
 * Suppress console output matching the given patterns for the current test only.
 * Automatically resumes after the test completes (pass or fail).
 *
 * Usage:
 *   suppressConsole(/Failed to fetch/)
 *   suppressConsole([/Failed to fetch/, /error boundary/])
 */
export function suppressConsole(patterns: RegExp | RegExp[]): void {
  installOnce()
  const arr = Array.isArray(patterns) ? patterns : [patterns]
  testPatterns.push(...arr)
}

/**
 * Suppress console output matching the given patterns for ALL tests in this file.
 * Call at the top level of `describe()` or at module scope.
 * Does NOT auto-clear between tests.
 *
 * Usage:
 *   suppressConsoleGlobal(/Background sync failed/)
 *   suppressConsoleGlobal([/Background sync/, /some other noise/])
 */
export function suppressConsoleGlobal(patterns: RegExp | RegExp[]): void {
  installOnce()
  const arr = Array.isArray(patterns) ? patterns : [patterns]
  globalPatterns.push(...arr)
}
