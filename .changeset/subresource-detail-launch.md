---
'@igstack/app-catalog-frontend-core': patch
---

Launch a sub-resource from its own detail page

Clicking a sub-resource's name opens its detail panel, which showed the access
chain but no way to open the thing — the only launch affordance lived in the
parent table's cloud-account cell, so the most obvious path through the UI was a
dead end. The panel now renders an `Open` button whenever the sub-resource has
its own `appUrl`, keyed on that URL rather than on a cloud account id, so any
sub-resource carrying one is launchable. It never falls back to the parent's
URL — that fallback is what dropped people into the wrong AWS account.
