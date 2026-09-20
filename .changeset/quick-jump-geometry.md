---
'@igstack/app-catalog-frontend-core': minor
---

A measured pass over the Quick Jump row: one inset, one type size, one fill.

**It stays inside the panel.** Between 640 and 792px the row used to stop
wrapping while the panel it sits in was still narrower than the control, so the
group overflowed by ~100px, the panel grew a horizontal scrollbar and Jump — the
primary action — sat off-screen. The row now wraps at every width, the group
cannot exceed its container, and the identifier field can shrink.

**The row holds exactly one brand fill, and it is on Jump.** The app's own open
button and Jump had byte-identical backgrounds, so four elements read as one
blob. The open button steps down to `secondary` with a border (without the
border it merges into the destination picker instead — the two greys are 0.015
apart in lightness) whenever the app also offers a Quick Jump, and keeps its
primacy through position and its self-describing label. Both fills darken to
5.19:1, up from 4.56:1 — `14px/700` is not large text.

**Jump presses in rather than hopping.** The lift-and-crouch belongs to a
free-standing button; on a segment welded into a bordered frame it covered the
frame's top border on hover and opened 3.5px of card above itself on press. It
now takes an inset shadow and a darker fill, and the arrival keyframe — caught
mid-flight 2px outside the frame — is gone. The open button keeps the motion.

**The width goes where the text is.** The picker was a fixed 11rem that
truncated most destination titles while the field spent 249px on an 8-character
id. The picker is now as wide as the app's widest destination (capped), sized
from an invisible copy of that label so it cannot move when you switch
destinations, and the field is 170px.

**Everything lines up.** One 12px horizontal inset on the open button and all
three segments, one 6px label-to-icon gap, one 14px/20px type scale, and a
`min-height` on each segment rather than borrowed from a sibling — which is what
left the picker a 20.5px tap target once it stacked (40px now), and made the row
33.5px on an app with Quick Jumps but 32px on one without (34px on both now).
Inner corners are concentric with the frame, and the dark theme's corner scale
now matches the light one instead of quietly being half of it.

**The dormant Jump describes itself once.** Its `title` said in different words
what the hint bubble already says, and the bubble was `aria-hidden`, so a screen
reader got neither; the bubble is now the button's `aria-describedby` and is
anchored to the field it points at. Tabbing lights the frame on all three
segments, not only the field, and the destination menu is never narrower than
the picker that opened it.
