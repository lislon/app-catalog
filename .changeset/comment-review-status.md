---
'@igstack/app-catalog-backend-core': minor
'@igstack/app-catalog-frontend-core': minor
---

Show what came of a comment. A comment was a write-only channel: someone took
the trouble to correct an entry, the correction was folded in, and nothing on the
page ever said so -- which is a poor argument for anyone to leave the next one.

A comment can now carry a status and one short reply from the maintainers.
`Applied -- thank you!` means the comment improved the entry; `Seen` means it was
read and the entry stayed as it was; an unreviewed comment shows nothing at all.
A one-line legend explains both, and appears only once some comment on that entry
carries a label.

Both are read-only in the UI and have no control to set them -- they are written
out of band by review tooling, so this adds no moderation surface and no auth.
