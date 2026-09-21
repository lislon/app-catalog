import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * A font family named in a theme token but never requested is invisible on any
 * machine that happens to have it installed — which is every developer's, and
 * no user's. So assert the wiring instead of the rendering.
 */
// The path is relative to the package root, which is where vitest runs.
const css = readFileSync('src/index.css', 'utf8')
const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The first family of every non-aliased declaration of a token. The first one
 * is the webfont; everything after it is a fallback by definition.
 */
function primaryFamilies(token: string): string[] {
  const declarations = [
    ...css.matchAll(new RegExp(`--${token}:\\s*([^;]+);`, 'g')),
  ]
    .map((match) => (match[1] ?? '').trim())
    .filter((value) => !value.startsWith('var('))
  expect(declarations.length).toBeGreaterThan(0)
  return declarations.map((value) =>
    (value.split(',')[0] ?? '').trim().replace(/^'|'$/g, ''),
  )
}

describe('web fonts', () => {
  it('requests its families before any other at-rule', () => {
    // Anywhere later it is invalid where it stands, so the minifier drops it
    // and the only symptom is a silent fallback to a system face.
    const atRules = [...withoutComments.matchAll(/^@[\w-]+[^;{]*/gm)].map(
      (match) => match[0].trim(),
    )
    expect(atRules[0]).toMatch(/^@import url\('https:\/\/fonts\./)
  })

  it.each(['font-sans', 'font-serif'])(
    '--%s names a family the stylesheet actually requests',
    (token) => {
      for (const family of primaryFamilies(token)) {
        // A system stack has nothing to download.
        if (family.startsWith('ui-') || family === 'system-ui') continue
        expect(withoutComments).toContain(`family=${family.replace(/ /g, '+')}`)
      }
    },
  )
})
