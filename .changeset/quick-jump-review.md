---
'@igstack/app-catalog-frontend-core': minor
'@igstack/app-catalog-test-kit': patch
---

A design and accessibility review pass over the Quick Jump bar. Everything here
was measured in a browser, not eyeballed.

**The control fitted on a phone about as well as a piano fits in a lift.** At a
390px viewport the three segments came to 505px inside a 218px panel — `Jump`,
the only thing in the row that navigates, was entirely off-screen, and the page
grew a horizontal scrollbar. Every segment was `flex: none` and the field had a
fixed `size`, so nothing could give. Below `sm` the picker now takes its own
line and the field shares the next one with Jump; from `sm` up nothing changes,
so a swapped destination still cannot slide the field sideways.

**The dormant Jump was not a control.** It was an `<a>` with no `href`, which
cannot take focus — so "press it and it tells you where to type" was mouse-only,
the hint's `:focus-visible` branch was dead code, and its `aria-disabled` sat on
a node no screen reader could reach. It is a `<button>` now, and an `<a>` only
once it has somewhere to go.

**Two WCAG AA failures on the fill both buttons use.** `--primary` under
`--primary-foreground` measures 3.8:1, and the usual `bg-primary/90` hover made
it worse by fading the fill toward the card rather than darkening it — so the
dormant Jump was _more_ legible than the armed one. Both buttons now darken the
fill (4.9:1) and darken further on hover (6.4:1). The token itself still owes
every other filled button in the app the same fix; that is a brand decision.

**One focus ring for three focusable segments.** The shell ringed itself on
`focus-within`, so tabbing picker → field → Jump looked identical at every stop.
The shell's ring is the field's now; the picker and Jump outline themselves.

**The leap moved the wrong thing.** It was hung on the whole 505px shell, so
hovering Jump lifted the field you had just typed into. The shell no longer
clips its segments, so Jump leaps on its own.

Smaller, same pass: the caret sits next to the picker's label instead of 85px
away at the far edge, where it read as the field's boundary; the picker and Jump
match the field's type size instead of running a size below it; the dormant Jump
is tinted toward the action instead of sharing the picker's grey, which had the
row reading as two dropdowns around a field; the hairline between the two
buttons is gone (it separated a solid pill from a recessed shell — nothing that
could be confused — and dangled as an orphan once the row wrapped); and the
armed title is the destination rather than the destination plus a URL the
browser already shows in the status bar.
