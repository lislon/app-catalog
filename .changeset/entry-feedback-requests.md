---
'@igstack/app-catalog-backend-core': minor
'@igstack/app-catalog-frontend-core': minor
'@igstack/app-catalog-test-kit': minor
---

Let anyone browsing an entry request a correction from the entry itself — free text,
optional images — and see what happened to what they asked.

The detail card gains a notes tab listing what was asked and what was applied. The author
may edit their wording for an hour and withdraw it until someone has reviewed it, both
enforced server-side: the control disappearing is a courtesy, a request arriving a second
late is still refused.

`DbComment` becomes `DbFeedback` plus `DbFeedbackAttachment`, migrating existing rows and
preserving their ids, review status and replies. Visitor identity moves out of the
comments module and becomes a shared actor, so the same pseudonym can serve anything else
that needs one.

Attachments are deliberately not assets: that table's name is unique and holds published
artwork, so a passing visitor's upload has no business sharing its namespace. Every upload
is decoded and re-encoded before storage, which is what drops EXIF, trailing data and
anything polyglot — and decoding is also the format check, so a text file announcing
itself as an image is refused and a valid SVG carrying a script is rasterised with no
script surviving. An image is claimed on submit by its uploader only, and anything never
submitted is swept.
