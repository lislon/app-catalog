import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * The overlay primitives carry `animate-in` / `animate-out` classes, so a unit
 * test that asserts the class is on the element passes whether or not the
 * utilities exist — and this import sat commented out for months with nothing
 * moving on screen. So assert the wiring, like stylesheetFonts does.
 */
// The path is relative to the package root, which is where vitest runs.
const css = readFileSync('src/index.css', 'utf8')
const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '')

describe('animation utilities', () => {
  it('imports tw-animate-css outside a comment', () => {
    expect(withoutComments).toMatch(/@import\s+['"]tw-animate-css['"]/)
  })

  it('disables animation for prefers-reduced-motion', () => {
    expect(css).toContain('prefers-reduced-motion: reduce')
  })
})
