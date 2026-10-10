---
'@igstack/app-catalog-frontend-core': minor
'@igstack/app-catalog-test-kit': minor
---

Add plugin slots, so a consuming app can render its own UI at points the core
declares without the core knowing anything about it.

Pass an array of plugins to `<App extensions={[...]} />`. Each contributes
`slots` (rendered at a point, several plugins may share one) and/or `wrappers`
(rendered around a subtree, so a plugin can supply context). The prop is
optional: with no plugins registered every slot renders nothing and every
wrapper passes its children through, so existing behaviour is unchanged.

Handlers are typed from a single per-feature spec, so registering an unknown
slot or reading a field a slot does not pass is a compile error.

Each contribution is isolated behind its own error boundary and `Suspense`: a
plugin that throws or suspends cannot take down the host or its peers. The two
fallbacks differ by design — a leaf slot falls back to nothing, so its region is
simply absent, while a wrapper falls back to the children it was wrapping, since
a wrapper only decorates and must never blank the subtree underneath it.

`useSlotFilled(slot)` reports whether any plugin fills a slot, for the cases
where the core has to change its own layout around one rather than just render
it — a table column, whose header would otherwise sit above no cells in a build
that registers nothing. `usePluginUser()` projects the signed-in user into the
shape slots receive, in one place, and returns `null` with no auth provider
above it.

`given()` in the test kit now accepts `extensions`, so a plugin can be mounted
in tests exactly as it ships. `registerCatalog()` takes them too, as an optional
third argument, so Gherkin scenarios exercise the app as it is actually built
without a `.feature` file having to name any plugin.

Also adds `useOptionalUser`, which returns `null` rather than throwing when
there is no `AuthProvider` above it.
