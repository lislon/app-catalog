#!/usr/bin/env bash
# Self-check for sync-alpha.sh against a scratch bare remote, with `gh` stubbed.
# Run: bash scripts/sync-alpha.test.sh
set -euo pipefail

script="$(cd "$(dirname "$0")" && pwd)/sync-alpha.sh"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

mkdir "$tmp/bin"
cat > "$tmp/bin/gh" <<'EOF'
#!/usr/bin/env bash
echo "gh $*" >> "$GH_LOG"
if [ "$1 $2" = "pr list" ]; then cat "$GH_OPEN_PRS"; fi
EOF
chmod +x "$tmp/bin/gh"
export PATH="$tmp/bin:$PATH" GH_LOG="$tmp/gh.log" GH_OPEN_PRS="$tmp/open-prs"

git init --quiet --bare "$tmp/remote.git"
git clone --quiet "$tmp/remote.git" "$tmp/work" 2>/dev/null
cd "$tmp/work"
git config user.email t@t && git config user.name t && git config commit.gpgsign false
commit() { git commit --quiet --allow-empty -m "$1"; }
commit base && git push --quiet origin HEAD:main HEAD:alpha

fail() { echo "FAIL: $1"; exit 1; }
remote_alpha() { git ls-remote origin refs/heads/alpha | cut -f1; }

# Equal: nothing to do.
bash "$script" | grep -q 'already contains' || fail 'equal branches'

# Behind: alpha is fast-forwarded to main.
commit release && git push --quiet origin HEAD:main
bash "$script" >/dev/null
[ "$(remote_alpha)" = "$(git rev-parse HEAD)" ] || fail 'fast-forward'

# Diverged: no push, a PR is opened; with one already open, nothing happens.
git checkout --quiet -b a origin/main && commit alpha-only && git push --quiet origin HEAD:alpha
git checkout --quiet - && commit release2 && git push --quiet origin HEAD:main
before="$(remote_alpha)"
: > "$GH_OPEN_PRS"
bash "$script" >/dev/null
[ "$(remote_alpha)" = "$before" ] || fail 'diverged alpha was pushed'
grep -q 'pr create --base alpha --head main' "$GH_LOG" || fail 'no PR opened'
echo 42 > "$GH_OPEN_PRS" && : > "$GH_LOG"
bash "$script" | grep -q 'already open' || fail 'existing PR not detected'
! grep -q 'pr create' "$GH_LOG" || fail 'duplicate PR opened'

echo 'sync-alpha: all cases pass'
