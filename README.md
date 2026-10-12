# App Catalog

App Catalog allows you to maintain a centralized directory of applications with metadata, tags, screenshots, and approval workflows.

# Stage of project

As of 2026-Feb project is currently in development, not ready to be used on production.

## Local development

### Quick Start

To start both backend and frontend with hot reload:

```bash
pnpm run -w dev
```

This command will:

- Start the backend server on `http://localhost:4001`
- Start the frontend dev server on `http://localhost:4000`
- Watch for changes in both projects (no restart needed)
- Run both servers in parallel

Navigate to `http://localhost:4000` to view the application.

### Manual Setup (if needed)

```
npm install
npx nx run backend:generate
npx nx run backend:serve
npx nx run frontend:serve
```

Navigate to `http://localhost:4001`

### Migration

Change schema in `schema.prisma` and then run

```bash
cd apps/backend
prisma generate
npx prisma migrate dev
```

## Releasing

Two channels, one merge each:

- **`alpha`** — every push publishes a timestamped `@alpha` snapshot. Nothing is
  committed back to the branch.
- **`main`** — merging a PR that carries a changeset publishes `@latest`:
  `scripts/release-main.sh` versions the packages, publishes them and commits
  the bump back in the same run. A PR with no changeset publishes nothing.

### Versioning

Changesets are `minor` or `patch`. A major makes every consumer migrate before it
can take any later fix, so a breaking change is the last resort, not the default:

1. **Add the new thing and keep the old one working.** New field, prop or
   parameter beside the old one; the old path behaves as before.
2. **Deprecate in place.** Mark the old one `@deprecated` and name its
   replacement in the JSDoc. It still compiles and still runs.
3. **Remove it later, in a PR of its own**, once no consumer references it.

`scripts/assert-no-major.mjs` enforces this. It computes the release plan from
the pending changesets — the plan, not the declared bump types, because a peer
dependent turns a `minor` into a major on its own and the `fixed` group spreads it
to every package — and fails if any package would go major. It runs on every PR
and again before the release. A major nothing can avoid needs the `allow-major`
label on the PR, and then a manual run of the CI workflow with `allow_major=true`
to release it.

# Test alpha snapshot
