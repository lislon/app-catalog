---
'@igstack/app-catalog-frontend-core': patch
---

Changing a url param no longer tears the page down and rebuilds it.

Five routes awaited a loader that returned `{}`. Nothing ever read it — there is
no `useLoaderData` call anywhere — but awaiting it made every navigation to those
routes asynchronous, so a `?qj=`, `?sub=`, `?filterTag=` or `?deprecated=` change
re-ran it, the route match went pending, and the subtree `_layout` renders was
unmounted and rebuilt on the other side.

Two things fell out of that. Component state inside the detail panel was
destroyed on every param change. And the fresh mount re-ran the whole data layer:
`/api/auth/session` twice, `auth.getProviders`, `comments.list` and
`appCatalog.getData` on every param toggle.

The loaders and the module they called are deleted. A test asserts the three
render-nothing catalog routes declare none, because the integration test cannot:
in jsdom the navigation resolves without the remount, so it passes either way.
