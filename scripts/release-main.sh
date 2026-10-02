#!/usr/bin/env bash
# Release the stable channel from `main` in a single merge.
#
# The former flow took two: changesets opened a "version packages" PR, and only
# merging *that* published. A release could therefore sit one merge short of the
# registry with every check green, which is the failure this removes. The
# pre-release branch already published in one push; now the stable channel does
# too, so neither needs a human between a merge and the registry.
#
# Order matters: publish first, then record. A published version is immutable and
# the dist-tag guard proves it moved; if the commit-back then fails, re-pushing
# the version commit is a safe retry. The reverse order would leave a recorded
# version the registry never received, and the consumed changesets would be gone,
# so nothing would publish it on a retry.
#
# Usage: release-main.sh   (run from a checkout of `main`, with GITHUB_TOKEN set)
set -euo pipefail

if [ -z "$(ls -A .changeset/*.md 2>/dev/null | grep -v README || true)" ]; then
  echo 'No changesets — nothing to release.'
  echo 'published=false' >>"${GITHUB_OUTPUT:-/dev/null}"
  exit 0
fi

# Bumps every publishable version, writes the CHANGELOGs, deletes the consumed
# changesets and relocks.
pnpm run changeset:version
pnpm run build:all
# write-git-sha + publish each package with npm OIDC + `changeset tag`.
pnpm run changeset:publish

# Read the tags now, while HEAD is still the commit `changeset tag` tagged — the
# version commit below moves HEAD past them.
tags="$(git tag --points-at HEAD)"

version="$(node -p "require('./packages/backend-core/package.json').version")"

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git add -A
# [skip ci]: this push is the record of a release that already happened, not a
# new change to release.
git commit -m "chore: version packages ${version} [skip ci]"
git push origin "HEAD:${1:-main}"

# Lightweight tags, which `--follow-tags` ignores, so they have to be named
# explicitly or the tag trail never leaves the runner.
if [ -n "${tags}" ]; then
  # shellcheck disable=SC2086 # one argument per tag is the point
  git push origin ${tags}
fi

# One GitHub release per tag, with that package's new CHANGELOG section as the
# body. `changesets/action` used to do this; it is the only part of the release
# trail that does not fall out of the publish itself, so it has to be explicit.
for tag in ${tags}; do
  # @scope/name@1.2.3 -> packages/<name minus the common prefix>
  pkg="${tag%@*}"
  changelog="packages/${pkg##*app-catalog-}/CHANGELOG.md"
  notes="$(awk '/^## /{if (seen++) exit; next} seen' "${changelog}" 2>/dev/null || true)"
  gh release create "${tag}" --title "${tag}" --notes "${notes:-Released ${version}.}" ||
    echo "warning: could not create a release for ${tag}" >&2
done

echo "published=true" >>"${GITHUB_OUTPUT:-/dev/null}"
echo "released ${version}"
