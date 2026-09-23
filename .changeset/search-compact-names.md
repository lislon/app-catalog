---
'@igstack/app-catalog-shared-core': patch
---

Search now matches names ignoring whitespace and punctuation, so a CamelCase app typed as two words (`acme pro` → `AcmePro`) or a dotted abbreviation ranks on the name tiers instead of sinking to the description tier behind unrelated apps. Applies to displayName, abbreviation and nicknames, and to the `<app>/<term>` sub-resource search.
