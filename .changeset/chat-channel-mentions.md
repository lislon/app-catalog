---
'@igstack/app-catalog-frontend-core': minor
---

Bare chat-channel mentions such as `#swaggerhub` in catalog text now render as
links when the consuming app sets `UiSettings.chatChannelUrlTemplate` (for
example `https://<workspace>.slack.com/channels/{name}`); without it they stay
plain text. Existing links, link fragments, inline code and digits-only
mentions are left alone. Access-request comments, request prompts and
post-approval steps now render through the same markdown component as the
description, so links behave identically in every text field.
