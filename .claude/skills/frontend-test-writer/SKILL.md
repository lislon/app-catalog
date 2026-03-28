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

## Configuration Layers (from broadest to most specific)

1. **`given(magazine)`** — entry point, renders real `<App />`, returns `{ ui, backend }`
2. **Magazine** — high-level preset (e.g., `magazine.full()`, `magazine.single()`). Sets up a realistic baseline.
3. **Magazine features** — toggle business-level scenarios within a magazine (e.g., `prepopulateCache`, `dismissOnboarding`). Controlled by feature flags passed to the magazine factory.
4. **`backendCfg`** — individual entity configurators: `withApp()`, `withTag()`, `withApprovalMethod()`, `withUser()`. Fine-grained control over mock DB contents.
5. **`browserStateCfg`** — browser local state: `withOfflineData()`, `dismissOnboarding()`, `withLocalStorageItem()`. Simulates returning users, cached data.
6. **`networkCfg.overrideConfig()`** — network-level overrides. Replaces specific MSW handlers to simulate errors, latency, malformed responses. Most specific layer — use for error scenarios.

Each magazine accepts an optional post-configurer for layers 4–6:

```
given(magazine.single(({ networkCfg }) => {
  networkCfg.overrideConfig((catalog) => catalog.replace([...], handler))
}))
```

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
