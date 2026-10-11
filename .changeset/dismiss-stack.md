---
'@igstack/app-catalog-frontend-core': minor
---

Give Escape one owner: a dismiss stack, so the layer that opened last is the
layer Escape closes.

Escape was handled in six independent places, and each had to know about the
others to avoid double-firing. The detail card bound Escape only
`enabled: !isGalleryOpen`. The gallery installed a capture-phase document
listener whose stated purpose was to beat Radix to the event. The screenshot
dialog cancelled Radix's own Escape by reading the gallery's fullscreen state
through a ref. Every new overlay had to learn that choreography, and getting it
wrong stayed invisible until someone pressed Escape in the wrong order — as it
was: a dialog opened over the detail card had no say, so one Escape closed the
card out from under it and navigated away from both.

Any overlay now says only that it is dismissable:

```tsx
useDismissable(onClose) // always
useDismissable(close, { enabled: isOpen }) // only while open
```

The stack is last-in-first-out, so the most recently registered enabled layer
owns Escape and the one beneath it takes over when that closes. No layer refers
to any other, and adding one above an existing layer needs no change to it.
`useDismissable` and `useDismissStack` are exported for a deployment's own
overlays, which join the same ordering as the core's.

Four details that each fix a specific way the hand-rolled version broke:

- **It works with no provider.** The default stack is app-wide, and
  `DismissStackProvider` only scopes a subtree. A hook that silently did
  nothing outside a provider would be the same class of bug this replaces —
  every render site, tests included, would have to remember a wrapper, and
  forgetting it would look like working code with dead Escape handling.
- **The listener is on the bubble phase**, so component handlers run first and a
  field that wants Escape for itself keeps it by calling `preventDefault` —
  cancelling an inline edit does not also close the card. A capture listener
  cannot honour that, because it runs before every handler that might object.
- **Radix is bridged in `DialogContent`.** Radix listens with `capture: true`,
  ahead of everything above, so it would close its own dialog even with another
  layer on top. It now asks the stack first and stands down if the stack had a
  layer; with an empty stack it closes as before, so dialogs that were never
  wired in keep working.
- **A re-render does not reorder the stack.** The entry is a stable object
  refreshed in place; re-registering on a changed callback identity would make
  the last layer to RE-RENDER win Escape instead of the last to OPEN.

The listener is installed only while something is registered, so an app with
nothing open has no global key handler at all.
