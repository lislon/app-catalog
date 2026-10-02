#!/usr/bin/env bash
# Release the stable channel from `main` in a single merge.
#
# The former flow took two: changesets opened a "version packages" PR, and only
# merging *that* published. A release could therefore sit one merge short of the
# registry with every check green — which is what made the pre-release branch
# load-bearing, because pushing it published unattended. With one branch left,
# that property has to live here (#214).
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

version="$(node -p "require('./packages/backend-core/package.json').version")"

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git add -A
# [skip ci]: this push is the record of a release that already happened, not a
# new change to release.
git commit -m "chore: version packages ${version} [skip ci]"
git push --follow-tags origin "HEAD:${1:-main}"

echo "published=true" >>"${GITHUB_OUTPUT:-/dev/null}"
echo "released ${version}"
