---
'@igstack/app-catalog-frontend-core': patch
---

Make the display serif actually render and surface the resource owner. The warm
theme defined a Fraunces display-serif token but nothing loaded the webfont or
applied it, so headings fell back to the system sans. Load Fraunces + Nunito
Sans via a real stylesheet link and apply the serif to the key display headings
(the wordmark, the app detail title, group headers, and the onboarding title).

Also render an **Owner** row in the app detail — "who is responsible for this
resource" — from `ownerPersonSlug`, kept visually distinct from the access
approver (who decides access requests), per the domain model.
