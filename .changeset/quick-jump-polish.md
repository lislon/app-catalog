---
'@igstack/app-catalog-frontend-core': minor
'@igstack/app-catalog-test-kit': patch
---

Four corrections to the Quick Jump bar, all from watching it get used.

**The buttons leap before the click, not after.** Both links open a new tab, and
the new tab takes focus the same instant the click lands — so the crouch-and-hop
keyframe that used to fire on click ran inside a backgrounded tab, and you only
ever saw it when you came back. It is now a `:hover` lift and an `:active`
crouch, which happen while you still have the page. The app's own button gets the
same motion: both of them are leaving for the app.

**The header breathes.** The row sat 0.25rem under the app title, close enough to
read as part of it. Now 0.75rem.

**Two labels per destination.** The picker shows the action alone
(`Rerun report`); the full `Tracker — Rerun report` stays in the menu,
where the choice between systems is actually being made. The picker is where that
choice is already over, so it was spending its fixed width on a word you had just
read.

**The dormant Jump explains itself on hover** — a bubble whose tail points at the
field rather than at the button under the cursor, and the field lights up at the
same time. Hovering something that does nothing is a question; the answer has to
be in the place the answer lives.
