import { execSync } from 'node:child_process'
import { globSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Pure: set `gitHead` on each package json.
 * @param {{path: string, json: Record<string, unknown>}[]} pkgs
 * @param {string} sha
 */
export function applyGitSha(pkgs, sha) {
  return pkgs.map(({ path: p, json }) => ({
    path: p,
    json: { ...json, gitHead: sha },
  }))
}

function main() {
  const sha =
    process.argv[2] ||
    process.env.GIT_SHA ||
    execSync('git rev-parse HEAD').toString().trim()
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const files = globSync('packages/*/package.json', { cwd: root }).map((f) =>
    path.join(root, f),
  )
  const pkgs = files
    .map((p) => ({ path: p, json: JSON.parse(readFileSync(p, 'utf-8')) }))
    .filter(({ json }) => json.private !== true)
  for (const { path: p, json } of applyGitSha(pkgs, sha)) {
    writeFileSync(p, JSON.stringify(json, null, 2) + '\n')
    console.log(`[write-git-sha] ${json.name} gitHead=${sha}`)
  }
}

// Run only as CLI, not when imported by the test.
if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  main()
}
