---
'@igstack/app-catalog-frontend-core': minor
'@igstack/app-catalog-test-kit': patch
'@igstack/app-catalog-backend-example': patch
---

Quick Jump is one control on the app's header instead of a section of its own:
`[ destination ▾ | id | Jump ]`, sitting next to the button that opens the app.
The section underneath — a column of buttons per identifier, a pin, and a
Configure popover for choosing which identifiers to show — is gone. It asked the
reader to scan a grid before typing anything, and the thing they came to do
(paste an id, land on the page) was three decisions deep.

What the new shape decides for them: the destination is a picker, not a row of
buttons, so the field and the action never move; `Jump` is the only thing that
navigates; pressing it while the field is empty puts the caret in the field
rather than doing nothing.

The chosen destination now lives in the url as `?qj=<slug>`, derived from the
jump's title (`Tracker — View case` → `tracker.view-case`), so "use this
destination on this app" is a link you can send. A `?qj=` that names no jump of
the open app is dropped rather than silently resolving to the first one.

The app's own open button drops the word "Open": it shows the host name followed
by the external-link glyph, which already says what pressing it does.

Also fixed on the way past: the screenshot preview was a clickable `div`, so the
gallery could not be opened from the keyboard. It is a labelled button now.
