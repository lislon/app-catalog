#!/usr/bin/env node
/**
 * Release guard: prove that a publish actually MOVED the npm dist-tag.
 *
 * Both publish paths treat "this exact version is already on the registry" as a
 * warning and exit 0 — `changeset publish` by design, and
 * `scripts/publish-oidc.mjs` deliberately, so partial-failure reruns are safe.
 * The consequence is that a release which shipped nothing reports success, while
 * the changeset that triggered it is consumed either way, so the next run has
 * nothing left to publish. That is how the stable channel stayed wedged for days
 * (#83 AC3) without a single red check.
 *
 * Usage:
 *   node scripts/dist-tag-guard.mjs capture --tag <tag> --out <file>
 *   node scripts/dist-tag-guard.mjs assert  --before <file> --mode snapshot|release
 *
 * `capture` records, for every publishable package under `packages/`, the
 * version declared in package.json and the version the registry currently
 * serves on <tag>. Run it before the publish step, while package.json still
 * describes what this run intends to ship.
 *
 * `assert` re-reads the registry and fails the job when the publish was a no-op:
 *
 *   --mode snapshot   The pre-release channel. Every push mints a fresh
 *                     timestamped version, so the tag MUST move on every run.
 *                     Requires <tag> to now serve the version currently
 *                     declared in package.json.
 *
 *   --mode release    The stable channel. A push with nothing new to publish is
 *                     legitimate, so the expectation comes from the capture: for
 *                     each package whose captured declared version was not the
 *                     one the registry served, <tag> must now serve it. Packages
 *                     that were already published stay silent.
 *                     The expectation cannot be re-read from the working tree,
 *                     because `changesets/action` rewrites package.json in place
 *                     when it opens a version PR.
 *
 * Reads are retried, because a fresh publish takes a few seconds to become
 * visible through npm's CDN. Unlike `scripts/check-registry-versions.mjs` this
 * guard is fail-CLOSED: it runs on the publish path, where "cannot tell" must
 * never be reported as "shipped".
 */
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const PACKAGES_DIR = 'packages'
const ATTEMPTS = 12
const DELAY_MS = 10_000

function flag(name) {
  const i = process.argv.indexOf(name)
  return i === -1 ? undefined : process.argv[i + 1]
}

function usage(message) {
  console.error(`${message}\n
Usage:
  node scripts/dist-tag-guard.mjs capture --tag <tag> --out <file>
  node scripts/dist-tag-guard.mjs assert  --before <file> --mode snapshot|release`)
  process.exit(2)
}

/** Every publishable package under packages/, sorted by name. */
function declaredPackages() {
  const found = []
  for (const dir of readdirSync(PACKAGES_DIR, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue
    let pkg
    try {
      pkg = JSON.parse(
        readFileSync(join(PACKAGES_DIR, dir.name, 'package.json'), 'utf8'),
      )
    } catch {
      continue
    }
    if (pkg.private || !pkg.name || !pkg.version) continue
    found.push({ name: pkg.name, version: pkg.version })
  }
  return found.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Version the registry currently serves on `tag`, or null when the tag does not
 * exist, the package was never published, or the lookup failed. `npm view` exits
 * 0 with empty output for a missing dist-tag, so both shapes land here.
 */
function served(name, tag) {
  try {
    const out = execFileSync(
      'npm',
      ['view', '--prefer-online', name, `dist-tags.${tag}`],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim()
    return out === '' ? null : out
  } catch {
    return null
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function capture() {
  const tag = flag('--tag')
  const out = flag('--out')
  if (!tag || !out) usage('capture needs --tag and --out')

  const snapshot = {
    tag,
    packages: declaredPackages().map((pkg) => ({
      ...pkg,
      served: served(pkg.name, tag),
    })),
  }
  if (snapshot.packages.length === 0) {
    console.error(`No publishable packages found under ${PACKAGES_DIR}/.`)
    process.exit(1)
  }
  writeFileSync(out, `${JSON.stringify(snapshot, null, 2)}\n`)
  console.log(`Captured @${tag} for ${snapshot.packages.length} package(s):`)
  for (const pkg of snapshot.packages) {
    console.log(
      `- ${pkg.name}: declares ${pkg.version}, @${tag} serves ${pkg.served ?? '(nothing)'}`,
    )
  }
  console.log(`\nWrote ${out}`)
}

async function assert() {
  const beforePath = flag('--before')
  const mode = flag('--mode')
  if (!beforePath) usage('assert needs --before')
  if (mode !== 'snapshot' && mode !== 'release') {
    usage('assert needs --mode snapshot or --mode release')
  }

  const before = JSON.parse(readFileSync(beforePath, 'utf8'))
  const tag = before.tag
  const publishedByAction = process.env.CHANGESETS_PUBLISHED
  if (publishedByAction) {
    console.log(`changesets/action reported published=${publishedByAction}`)
  }

  /** @type {{name: string, expect: string, was: string | null, actual?: string | null}[]} */
  let expected = []
  if (mode === 'snapshot') {
    const wasByName = new Map(before.packages.map((p) => [p.name, p.served]))
    expected = declaredPackages().map((pkg) => ({
      name: pkg.name,
      expect: pkg.version,
      was: wasByName.get(pkg.name) ?? null,
    }))
    const alreadyServed = expected.filter((e) => e.expect === e.was)
    if (alreadyServed.length > 0) {
      console.error(
        `The version(s) this run built are already on @${tag}, so the publish\n` +
          'could only ever be a no-op. Every snapshot must be a new version:\n',
      )
      for (const e of alreadyServed) {
        console.error(
          `  ${e.name}: built ${e.expect}, @${tag} already served it`,
        )
      }
      process.exit(1)
    }
  } else {
    expected = before.packages
      .filter((pkg) => pkg.version !== pkg.served)
      .map((pkg) => ({
        name: pkg.name,
        expect: pkg.version,
        was: pkg.served,
      }))
    if (expected.length === 0) {
      console.log(
        `Every package already declared the version @${tag} serves, so this run\n` +
          'was not expected to publish anything. Nothing to assert.',
      )
      return
    }
  }

  console.log(`Waiting for @${tag} to serve ${expected.length} new version(s)…`)
  const pending = new Map(expected.map((e) => [e.name, e]))
  for (let attempt = 1; attempt <= ATTEMPTS && pending.size > 0; attempt++) {
    for (const entry of [...pending.values()]) {
      entry.actual = served(entry.name, tag)
      if (entry.actual === entry.expect) {
        console.log(`✓ @${tag} ${entry.name} → ${entry.actual}`)
        pending.delete(entry.name)
      }
    }
    if (pending.size > 0 && attempt < ATTEMPTS) {
      console.log(
        `… ${pending.size} package(s) not visible yet (attempt ${attempt}/${ATTEMPTS}); retrying in ${DELAY_MS / 1000}s`,
      )
      await sleep(DELAY_MS)
    }
  }

  if (pending.size > 0) {
    console.error(
      `\nNOTHING WAS PUBLISHED: the @${tag} dist-tag did not move.\n\n` +
        'The publish step exited 0 anyway — a version that is already on the\n' +
        'registry is only a warning — so this run looks green while shipping\n' +
        'nothing. Do not treat it as a release.\n',
    )
    for (const entry of pending.values()) {
      console.error(
        `  ${entry.name}: expected @${tag} = ${entry.expect}, still serves ${entry.actual ?? '(nothing)'}` +
          ` (was ${entry.was ?? '(nothing)'} before the publish)`,
      )
    }
    console.error(
      '\nUsual cause: the declared version was already published, so there was\n' +
        'no new version left to ship. Bump the declared version and re-release.',
    )
    process.exit(1)
  }

  console.log(`\n@${tag} moved for every expected package.`)
}

const command = process.argv[2]
if (command === 'capture') {
  capture()
} else if (command === 'assert') {
  await assert()
} else {
  usage(`Unknown command: ${command ?? '(none)'}`)
}
