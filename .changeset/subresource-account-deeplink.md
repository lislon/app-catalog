---
'@igstack/app-catalog-frontend-core': patch
---

Link a sub-resource's account id to its own launch URL

The cloud-account column rendered the account id as plain text, so an entry
carrying its own per-account console URL had no way to be opened — the only
launch affordance was the parent's account-agnostic URL, which drops you into
whichever account you last used. When a sub-resource has an `appUrl`, its id is
now the link to it; ids without one stay plain text.
