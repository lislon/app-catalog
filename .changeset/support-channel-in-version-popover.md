---
'@igstack/app-catalog-frontend-core': minor
---

Move the attribution line out of the header and into the version popover, and let the consuming app configure a support channel (`attribution.supportChannel`). The channel renders as a chat-mark link built from the existing `chatChannelUrlTemplate`, and stays plain text when no template is set. The header now shows only the title and the version chip.
