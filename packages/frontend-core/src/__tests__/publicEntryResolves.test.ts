import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const srcDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Re-exporting from a bare directory silently strips the types for consumers.
 *
 * `export type { X } from './modules/foo'` emits `from './modules/foo.js'` into
 * `dist/esm/index.d.ts`, but the build writes `dist/esm/modules/foo/index.d.ts`
 * — so the specifier resolves to nothing. Because every consumer runs with
 * `skipLibCheck`, the unresolved import raises no error anywhere: the types
 * quietly degrade to `any`, and a consumer's own typecheck passes while
 * accepting absolutely anything.
 *
 * Measured, not theoretical: `keyof SlotSpec` accepted an arbitrary string from
 * a consuming app, and `PwaAutoUpdateOptions` had been shipping as `any` for
 * however long the export had existed. Writing `./modules/foo/index` fixes it.
 *
 * This checks the source rather than the build output so it runs without one.
 */
const ENTRY_POINTS = ['index.tsx', 'internal.ts']

function relativeSpecifiers(source: string): string[] {
  return [...source.matchAll(/from\s+'(\.[^']+)'/g)]
    .map((match) => match[1])
    .filter((specifier): specifier is string => specifier !== undefined)
}

describe.each(ENTRY_POINTS)('public entry %s', (entry) => {
  const source = readFileSync(resolve(srcDir, entry), 'utf8')

  it('re-exports no bare directory', () => {
    const offenders = relativeSpecifiers(source).filter((specifier) => {
      const target = resolve(srcDir, specifier)
      return existsSync(target) && statSync(target).isDirectory()
    })

    // Thrown rather than passed to expect() as a message: the repo's
    // vitest/valid-expect rule allows only one argument, and a bare
    // "expected [x] to equal []" would not explain why it matters.
    if (offenders.length > 0) {
      throw new Error(
        `Bare directory re-export(s) in src/${entry}: ${offenders.join(', ')}.\n` +
          'Emitted as "<dir>.js", which has no .d.ts, so every type behind it\n' +
          'becomes `any` for consumers without any error. Append "/index".',
      )
    }
    expect(offenders).toEqual([])
  })

  it('resolves every relative specifier to a real module', () => {
    const unresolved = relativeSpecifiers(source).filter((specifier) => {
      const base = resolve(srcDir, specifier.replace(/\.js$/, ''))
      return !['', '.ts', '.tsx', '.d.ts'].some((ext) =>
        existsSync(`${base}${ext}`),
      )
    })
    expect(unresolved).toEqual([])
  })
})
