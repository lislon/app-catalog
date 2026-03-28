---
name: frontend-test-writer
description: Write app-catalog frontend integration tests using the magazine/given/ui-tools framework. Understands when to reuse existing primitives vs create new ones.
globs:
  - 'packages/frontend-core/src/__tests__/integration/**'
---

# Frontend Integration Test Writer

## Framework Location

All infrastructure lives under `packages/frontend-core/src/__tests__/integration/`.

**Read these files before writing any test:**

- `appCatalog.integration.test.ts` — reference tests (the examples ARE the spec)
- `mock-backend/magazines.ts` — magazine definitions and `ConfigurerContext` type
- `harness/given.tsx` — the `given()` harness

## How Tests Work

```
given(magazine) → renders real <App /> with mock backend → returns { ui, backend }
```

A **magazine** configures three things via `ConfigurerContext`:

- `backendCfg` — mock DB data (apps, tags, approval methods, user)
- `browserStateCfg` — IndexedDB cache, localStorage (returning user simulation)
- `networkCfg` — network override callbacks (error simulation)

## Writing a Test

1. Pick the right magazine. Override only what the test cares about.
2. Use `ui.*` tools for interaction and assertion — don't query DOM directly unless no tool exists.
3. Use `suppressConsole(patterns)` for tests that intentionally trigger errors.

## When to Create a New Primitive

**Create a magazine feature** when: 2+ tests will share the same setup pattern (e.g., authorized user, specific app state).

**Create a UI tool method** when: 2+ tests need the same DOM query or interaction sequence.

**Don't create primitives** for: one-off error scenarios, single-test network overrides, unique assertion logic. Inline it.

**When unsure:** Ask the user — "This looks like a one-off. Should I inline it or create a reusable primitive?"

## Avoiding Mock Bloat

Tests should express **what** they verify in domain terms, not **how** the mock works. If a test has more mock setup than assertions, reconsider the approach:

- Can a magazine preset cover this?
- Can a feature flag on an existing magazine handle it?
- Is the test verifying too many things at once?
