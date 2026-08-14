import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'

// The @ai-sdk packages publish many times a day and hard-pin each other to exact
// versions. A floating range therefore resolves to a release that may be minutes
// old, and npm's registry metadata is not consistent that fast — a fresh install
// intermittently fails with ERR_PNPM_NO_MATCHING_VERSION on a transitive @ai-sdk
// dependency. Downstream consumers install from the registry without a lockfile,
// so an exact version in a *published* dependency field is what protects them.

// Walk up from the vitest cwd rather than resolving import.meta.url, which vitest
// serves through its /@fs/ prefix.
const findRepoRoot = () => {
  let dir = process.cwd()
  while (!existsSync(join(dir, 'pnpm-workspace.yaml'))) {
    const parent = dirname(dir)
    if (parent === dir) throw new Error('workspace root not found above cwd')
    dir = parent
  }
  return dir
}

const repoRoot = findRepoRoot()
const workspaceDirs = ['packages', 'examples']
const dependencyFields = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
] as const

const isAiSdkPackage = (name: string) =>
  name === 'ai' || name.startsWith('@ai-sdk/')

const isExactVersion = (range: string) => /^\d+\.\d+\.\d+/.test(range)

const collectPackageJsonPaths = () => {
  const paths = [join(repoRoot, 'package.json')]
  for (const dir of workspaceDirs) {
    for (const entry of readdirSync(join(repoRoot, dir), {
      withFileTypes: true,
    })) {
      if (entry.isDirectory()) {
        paths.push(join(repoRoot, dir, entry.name, 'package.json'))
      }
    }
  }
  return paths
}

const collectAiSdkRanges = () => {
  const found: { where: string; name: string; range: string }[] = []
  for (const path of collectPackageJsonPaths()) {
    let raw: string
    try {
      raw = readFileSync(path, 'utf8')
    } catch {
      continue
    }
    const pkg = JSON.parse(raw) as Record<string, Record<string, string>>
    for (const field of dependencyFields) {
      for (const [name, range] of Object.entries(pkg[field] ?? {})) {
        if (isAiSdkPackage(name)) {
          found.push({
            where: `${path.slice(repoRoot.length + 1)} (${field})`,
            name,
            range,
          })
        }
      }
    }
  }
  return found
}

describe('@ai-sdk dependency pins', () => {
  it('finds the @ai-sdk dependencies it is meant to guard', () => {
    expect(collectAiSdkRanges().length).toBeGreaterThan(0)
  })

  it('declares every ai / @ai-sdk dependency as an exact version', () => {
    const floating = collectAiSdkRanges().filter(
      ({ range }) => !isExactVersion(range),
    )
    expect(
      floating.map(({ where, name, range }) => `${where}: ${name}@${range}`),
    ).toEqual([])
  })
})
