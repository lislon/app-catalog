#!/usr/bin/env bash
# Bring `alpha` up to date with `main` after every push to `main`.
#
# The stable release commits its version bump, CHANGELOGs and the deletion of
# consumed changesets on `main` only. Without this, `alpha` keeps declaring the
# old versions (so `Registry Versions` goes red on every PR into it) and keeps
# the consumed changesets (so the next promotion releases them twice) (#166).
#
# Fast-forwards `alpha` when it has nothing of its own; otherwise opens a
# `main` -> `alpha` PR. Never force-pushes.
#
# Usage: sync-alpha.sh [remote]   (run from a checkout of `main`)
set -euo pipefail

remote="${1:-origin}"
main_sha="$(git rev-parse HEAD)"
git fetch --quiet "$remote" alpha
alpha_sha="$(git rev-parse FETCH_HEAD)"

if git merge-base --is-ancestor "$main_sha" "$alpha_sha"; then
  echo "alpha already contains main ($main_sha)"
elif git merge-base --is-ancestor "$alpha_sha" "$main_sha"; then
  git push "$remote" "$main_sha:refs/heads/alpha"
  echo "fast-forwarded alpha $alpha_sha -> $main_sha"
elif [ -n "$(gh pr list --base alpha --head main --state open --json number --jq '.[].number')" ]; then
  echo "alpha has diverged; a main -> alpha PR is already open"
else
  gh pr create --base alpha --head main \
    --title 'chore: sync alpha with main' \
    --body 'alpha has commits main does not, so it cannot be fast-forwarded. Merge this to bring the released versions and consumed changesets back to alpha (#166).'
fi
