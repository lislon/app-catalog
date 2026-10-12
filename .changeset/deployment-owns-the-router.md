---
'@igstack/app-catalog-frontend-core': minor
'@igstack/app-catalog-test-kit': minor
---

Let a consuming app own the route tree, so it can compose the core's routes with
its own and serve any URL it likes — including top-level paths the core has never
heard of — with full type safety over the merged tree.

The obstacle was a single TypeScript fact: TanStack's type safety comes from a
global `declare module … Register` augmentation, exactly one of which may exist
per program, and a type-only reference still drags it in. (Verified for
`import type`, inline `{ type T }`, `ReturnType<typeof fn>`, a barrel re-export
and `await import()`; augmentations are collected when the program is built and
elision is emit-only.) The core's `Register` therefore reached every consumer,
and no consumer could declare its own.

Three changes follow from that:

- **`createAcRouter` now lives on its own subpath, `/router`.** It is the only
  published door to the core's `Register` and route tree. Import it if you use
  the core's tree unchanged — the example app and the core's own suites do. An
  app that composes its own tree must not, and nothing on the main entry
  references it.
- **`AppProps.router` is `RegisteredRouter`** rather than a concrete router
  type. It resolves per program against whatever `Register` that program
  declared, and widens nothing: a router built from a different tree is still
  rejected.
- **`appPropsFactory` takes `createRouter`.** The route tree belongs to the
  consumer, so the factory can no longer build the router itself. Using the
  core's tree unchanged? Pass `createAcRouter` from
  `@igstack/app-catalog-frontend-core/router`.

A route the consumer places inside the core's pathless `_layout` can opt into
the catalog layout, and therefore its providers, by declaring
`staticData: { acCatalogLayout: true }`. Without it such a route renders bare
and the first hook that needs the catalog throws, since the core cannot know a
route it has never seen wants its providers. The opt-in also tells the layout
which entry the route belongs to, so a consumer's route under `/app/$slug/...`
opens the card for that entry instead of dropping the user on the index.

Adds `useCatalogResources()` — `{ resources, isLoading }` — for resolving path
params against the catalog, deliberately narrower than the full context. Use the
loading flag to tell "still fetching" from "no such resource": a deep link
renders before the catalog arrives, and treating that as a bad link redirects
away from every valid one.

In the test kit, the harness cannot import a route tree for the same reason, so
it takes a router factory by registration: call `setRouterFactory()` from a
vitest setup file. Registration rather than a required `given()` option, so no
existing call site changes; `given()` also accepts `createRouter` directly.

Two fixes found along the way: the `/router` subpath was emitting types with no
JavaScript, and the default error component crashed on a non-`Error` throw.
