/**
 * Refuses a release plan that raises any package's major version, unless the
 * major was approved explicitly with `ALLOW_MAJOR=true`.
 *
 * Runs on the pending changesets, before anything is versioned, so it gives the
 * same answer on a pull request as on the release that would follow it. It
 * reads the plan changesets itself computes, not the bump types the changesets
 * declare: a peer dependent escalates to major on its own, and the `fixed`
 * group spreads that major to every package, so a set of `minor` changesets can
 * still plan a major.
 *
 * Why majors are refused at all: README.md, "Versioning".
 */
import getReleasePlan from '@changesets/get-release-plan'

const plan = await getReleasePlan(process.cwd())
const majors = plan.releases.filter((release) => release.type === 'major')

if (majors.length === 0) {
  console.info('major-guard: no package changes major version')
  process.exit(0)
}

const lines = majors.map(
  (release) =>
    `  ${release.name}: ${release.oldVersion} -> ${release.newVersion}`,
)

if (process.env.ALLOW_MAJOR === 'true') {
  console.info(['major-guard: approved major bump', ...lines].join('\n'))
  process.exit(0)
}

const declared = plan.changesets.filter((changeset) =>
  changeset.releases.some((release) => release.type === 'major'),
)

console.error(
  [
    'major-guard: this change would release a new major version:',
    ...lines,
    '',
    declared.length > 0
      ? `Declared major in: ${declared.map((c) => `.changeset/${c.id}.md`).join(', ')}`
      : 'No changeset declares `major`; the bump comes from peer-dependent or `fixed`-group propagation. Check `pnpm changeset status --verbose`.',
    '',
    'Make the change additive instead (README.md, "Versioning").',
    'If a major is unavoidable: on a pull request add the `allow-major` label;',
    'for the release, run the CI workflow manually with allow_major=true.',
  ].join('\n'),
)
process.exit(1)
