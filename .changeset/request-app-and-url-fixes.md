---
'@igstack/app-catalog-frontend-core': minor
---

A zero-result search can now ask for the thing it did not find.

Searching for something absent showed `No results for "x"` and nothing else — which
throws away the most informative moment in the catalog, because someone has just said
exactly what they expected to find. The dialog pre-fills what they typed, since asking
again is a toll on the one person who already told us what is missing. It files a
catalog-level ask, and confirms: reporting into silence is how a person learns not to
bother.

Two URL fixes on the detail card:

- `?tab=` no longer names the tab the card opens on. The first tab is the default, so
  putting it in the URL said nothing and made every shared link carry a param the sender
  never chose.
- Closing the card clears the card's own params (`tab`, `sub`, `qj`) instead of leaving
  them on the catalog, where they mean nothing and travel into any link copied
  afterwards. The catalog's own state — filters, recents, the deprecated toggle —
  deliberately survives, because it outlives any one card.
