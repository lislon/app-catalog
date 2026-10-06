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
plugin that throws or suspends cannot take down the host or its peers.

`given()` in the test kit now accepts `extensions`, so a plugin can be mounted
in tests exactly as it ships.

Also adds `useOptionalUser`, which returns `null` rather than throwing when
there is no `AuthProvider` above it.
