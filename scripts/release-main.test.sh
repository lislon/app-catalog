#!/usr/bin/env bash
# Self-check for release-main.sh against a scratch bare remote, with `pnpm`
# stubbed. This script is the only path to the registry, so the two things that
# must hold are checked here: a push carrying no changeset releases nothing, and
# a push carrying one publishes BEFORE it records the version.
# Run: bash scripts/release-main.test.sh
set -euo pipefail

script="$(cd "$(dirname "$0")" && pwd)/release-main.sh"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

mkdir "$tmp/bin"
cat >"$tmp/bin/pnpm" <<'EOF'
#!/usr/bin/env bash
echo "pnpm $*" >> "$PNPM_LOG"
# `changeset:version` consumes the changesets and bumps the version, so the
# stub does both — the script reads the version back off disk.
if [ "$*" = "run changeset:version" ]; then
  rm -f .changeset/*.md
  node -e 'const f="packages/backend-core/package.json";const p=require("./"+f);p.version="9.9.9";require("fs").writeFileSync(f,JSON.stringify(p))'
fi
# Records what the remote looked like at publish time, so the test can prove the
# publish ran before the version commit was pushed.
if [ "$*" = "run changeset:publish" ]; then
  git ls-remote origin refs/heads/main | cut -f1 > "$PUBLISH_SAW_MAIN"
fi
EOF
chmod +x "$tmp/bin/pnpm"
export PATH="$tmp/bin:$PATH" PNPM_LOG="$tmp/pnpm.log"
export PUBLISH_SAW_MAIN="$tmp/publish-saw-main"

git init --quiet --bare "$tmp/remote.git"
git clone --quiet "$tmp/remote.git" "$tmp/work" 2>/dev/null
cd "$tmp/work"
git config user.email t@t && git config user.name t && git config commit.gpgsign false
mkdir -p .changeset packages/backend-core
echo '# changesets' >.changeset/README.md
echo '{"name":"core","version":"1.0.0"}' >packages/backend-core/package.json
git add -A && git commit --quiet -m base && git push --quiet origin HEAD:main

fail() { echo "FAIL: $1"; exit 1; }
remote_main() { git ls-remote origin refs/heads/main | cut -f1; }

# No changeset: nothing is versioned, published or pushed.
before="$(remote_main)"
: >"$PNPM_LOG"
bash "$script" | grep -q 'nothing to release' || fail 'no-changeset run did not bail'
[ ! -s "$PNPM_LOG" ] || fail 'no-changeset run ran pnpm'
[ "$(remote_main)" = "$before" ] || fail 'no-changeset run pushed'

# With a changeset: version, build, publish, then record.
printf -- "---\n'core': patch\n---\n\nchange\n" >.changeset/a-change.md
git add -A && git commit --quiet -m 'feat: a change' && git push --quiet origin HEAD:main
unreleased="$(remote_main)"
bash "$script" | grep -q 'released 9.9.9' || fail 'release did not report a version'
grep -q 'run changeset:publish' "$PNPM_LOG" || fail 'nothing was published'
[ "$(remote_main)" != "$before" ] || fail 'the version commit was not pushed'
git fetch --quiet origin main
git log -1 --format=%s FETCH_HEAD | grep -q 'version packages 9.9.9' ||
  fail 'the version commit is not on main'
git log -1 --format=%s FETCH_HEAD | grep -q '\[skip ci\]' ||
  fail 'the version commit would retrigger CI'

# The publish must come before the commit-back: a recorded version the registry
# never received cannot be retried, because the changesets are already consumed.
[ "$(cat "$PUBLISH_SAW_MAIN")" = "$unreleased" ] ||
  fail 'the version commit was pushed before the publish'

echo 'release-main: all cases pass'
