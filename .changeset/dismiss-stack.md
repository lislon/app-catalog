---
'@igstack/app-catalog-frontend-core': minor
---

Give Escape one owner: a dismiss stack, so Escape closes the layer on top and
only that layer.

Escape was handled in six independent places, and each had to know about the
others to avoid double-firing. The detail card bound Escape only
`enabled: !isGalleryOpen`. The gallery installed a capture-phase document
listener whose stated purpose was to beat Radix to the event. The screenshot
dialog cancelled Radix's own Escape by reading the gallery's fullscreen state
through a ref. Every new overlay had to learn that choreography, and getting it
wrong stayed invisible until someone pressed Escape in the wrong order — as it
was: a dialog opened over the detail card had no say, so one Escape closed the
card out from under it and navigated away from both.

Any overlay now says only that it is dismissable, and which element it is:

```tsx
const ref = useRef<HTMLDivElement>(null)
useDismissable(ref, onClose) // always
useDismissable(ref, close, { enabled: isOpen }) // only while open
```

The layer on top owns Escape, and the one beneath takes over when it closes.
"On top" is document order — the last enabled layer in the document. A portal
appends to the end of `<body>`, a child route renders after its parent's page,
and a nested layer is a descendant, which follows its ancestor; so this is what
"on top" means on screen, regardless of when anything mounted. That is why the
element is required. Two time-based keys were tried first and both broke:

- **Registration order.** A child's effects run before its parent's, so a
  viewer nested in the card registered first and the card looked newer: Escape
  in the screenshot viewer closed the card and left the catalog index.
- **Activation time.** On a cold deep link a dialog's route resolves before the
  catalog arrives, so the card it sits over mounts later and looked newer:
  Escape closed the card first, and the card took focus back off the dialog.

No layer refers to any other, and adding one above an existing layer needs no
change to it. `useDismissable` and `useDismissStack` are exported, so a
deployment's own overlays join the same ordering as the core's.

Further details, each fixing a way the hand-rolled version broke:

- **Focus follows the stack.** When the top layer closes and its focus falls
  to `<body>`, the layer now on top receives it, unless something more specific
  already placed it (Radix returns focus to a trigger). `topElement()` lets a
  layer that focuses itself on mount yield to one opened over it.
- **It works with no provider.** The default stack is app-wide;
  `DismissStackProvider` only scopes a subtree. A hook that silently did nothing
  outside a provider would be the same class of bug this replaces.
- **The listener is on the bubble phase**, so component handlers run first and a
  field that wants Escape for itself keeps it by calling `preventDefault` —
  cancelling an inline edit does not also close the card. A capture listener
  cannot honour that, because it runs before every handler that might object.
- **Radix is bridged in `DialogContent`.** Radix listens with `capture: true`,
  ahead of everything above, so it would close its own dialog even with another
  layer on top. It now asks the stack first and stands down if the stack had a
  layer; with an empty stack it closes as before.
- **The detail card registers from the panel**, which owns its element, rather
  than from the app body — the sub-resource view renders a different body, which
  left that view with no Escape at all.

The listener is installed only while something is registered, so an app with
nothing open has no global key handler.
