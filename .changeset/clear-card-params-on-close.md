---
'@igstack/app-catalog-frontend-core': patch
---

Closing a detail card now actually clears the card's own url params.

The previous attempt cleared them inside the close handler, which does not hold:
`useUrlSyncedState` only ever pushes its state OUT to the url, so the tab strip — still
mounted for one more render — saw the url disagreeing with its own state and wrote `tab`
straight back. Two owners of one key, and the one on its way out got the last word.
Measured on a live host: `?tab=notes` survived the close every time.

Clearing now happens on the catalog page once no card is open, so one owner decides and
it decides after the strip has gone. Only the card's params go; filters, recents and the
deprecated toggle outlive any card.
