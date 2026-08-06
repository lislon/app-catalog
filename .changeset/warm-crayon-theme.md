---
'@igstack/app-catalog-frontend-core': minor
---

Re-theme the catalog with a warm, crafted visual identity matched to the
hand-drawn logo. The previous palette was built around a generic purple accent
on a cool blue-gray background that read as a templated dashboard. The design
tokens now use a warm "crayon" palette derived from the logo — an orange primary
with amber/coral/blue/green chart colors — on a cream paper background, with a
rounder corner radius and a friendlier type pairing (Fraunces display serif +
Nunito Sans body). Because every component reads these tokens, the whole app —
header, filters, buttons, badges, and the app detail panel — picks up the new
look at once, in both light and dark mode.

Also fixes the app detail "how to get access" section so it is never blank:
methods with no clickable target now render an explicit line — "open to
everyone, no request needed" for open access, or a fallback pointing to the
resource owner when the process is undocumented — instead of rendering nothing.
The section is retitled from "Access Request" to the task-oriented "How to get
access".

Each catalog row now also has a secondary "open in new tab" launch button for
the resource URL, so the fast "I just want the link" jump stays one click away
while the primary row click opens the access detail.
