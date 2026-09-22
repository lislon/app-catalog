---
'@igstack/app-catalog-frontend-build-vite': minor
---

`frontendViteConfig`: let an app opt out of the bundled VitePWA with `pwa.enabled: false`

`VitePWA()` returns an array of plugins, so an app that registers its own
VitePWA could not drop the bundled one by filtering the returned plugin list on
`plugin.name` — the array entry has no `name`, the filter passed it through, and
the build ran both plugin sets: two `sw.js` writes, two `manifest.webmanifest`
writes over the same paths, and an overwrite warning. Which of the two precache
manifests survived was decided by plugin order.

`pwa.enabled: false` skips the registration outright, so the app's own VitePWA
is the only one in the build. The default is unchanged.

The bundled manifest defaults also carried another app's `short_name` and
`description`; they now describe this one.
