---
'@igstack/app-catalog-backend-core': minor
'@igstack/app-catalog-frontend-core': minor
---

Add an optional `background` field to a catalog entry, rendered as its own
section low on the detail card.

Some of what people contribute about an app is history, not instructions: when
it was built, why, and who it was built for. There was nowhere to put it.
`description` has to stay plain instructions for a new user, and the agent-facing
fields are not shown to people, so that context either bloated the description or
was dropped.

The section renders only when the field is set, sits after the primary content,
and is styled quieter than the description -- it is context for a reader who
wants it, not something anyone needs in order to use the app. Deprecation and
replacement stay in `deprecated`; this field is history only.
