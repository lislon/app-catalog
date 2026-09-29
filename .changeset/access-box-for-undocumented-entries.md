---
'@igstack/app-catalog-frontend-core': patch
---

Always render the "How to get access" box, and stop promising a contact that
is not there. An entry with no access fields at all returned `null`, so its
card jumped from the description straight to the sources with no access
heading anywhere -- indistinguishable from an app that needs no request, on
every such entry. It now says the process is not documented yet, which is the
rule the `custom` path already followed.

That line also pointed at "the owner below" without checking one exists. The
approvers block and the detail page's owner block are both conditional, so an
entry with neither sent the reader to contact nobody; the wording now depends
on whether a contact is actually rendered.
