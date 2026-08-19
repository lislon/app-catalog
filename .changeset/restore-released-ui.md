---
'@igstack/app-catalog-backend-core': minor
'@igstack/app-catalog-frontend-core': minor
---

Restore catalog UI features that were already published but missing from the
stable branch

The stable branch was re-created from a snapshot that predates a batch of
already-released UI work, and the promotions for that batch were never replayed.
Anything installing the stable tag therefore had a _newer_ version number with an
_older_ app card. Restored, byte-for-byte against the published tree:

- App card: a primary "Open <url>" action instead of the muted secondary link,
  and the Added/Updated timestamps consolidated into one metadata row just above
  Sources (`Resource.createdAt` is now serialised for this).
- Access section: Step 1 / Step 2 badges for two-step access apps, with the
  post-approval instructions expanded by default for them (still a collapsible
  accordion for single-step apps), plus list styling for markdown prose.
- Launcher: close button and mount focus on the detail card so Esc works when the
  card was opened by mouse; clear (×) button in the hero search input; matched
  query text highlighted in search results and in matched sub-resource names.
- Gallery: Esc no longer propagates to the outer search listener, so closing the
  gallery keeps the search query.
