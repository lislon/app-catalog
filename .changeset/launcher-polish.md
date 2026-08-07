---
'@igstack/app-catalog-frontend-core': minor
---

Launcher detail & home polish: app detail now opens as a centered, wide modal
card (was a right slide-over) with the access block as the hero and a two-step
"parent access first" banner for nested resources. Search results annotate
which sub-resources matched a query and reveal the matched child on open.
Person chips expose both name and email in a popover so you can copy either.
Adds a header "Updated …" freshness line, a URL-on-hover launch affordance,
drops the redundant "App" type badge, and an optional attribution footer
(`UiSettings.attribution`).
