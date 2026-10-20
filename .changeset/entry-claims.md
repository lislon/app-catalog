---
'@igstack/app-catalog-backend-core': minor
'@igstack/app-catalog-frontend-core': minor
'@igstack/app-catalog-test-kit': minor
---

Entries carry claims: plain statements with a date, an origin, and a status (active, in review, or archived with a reason). They are stored, synced and shown on a new "Behind this card" tab (id `behind`; old `?tab=notes` links land there), which also holds visitor notes, the sources with their dates, and the AI prompt and memory. The tab's count is open notes plus claims in review. Documentation keeps only the documentation links and Background, and is hidden when an entry has neither. A "Share what you know" button at the right of the tab strip opens Behind this card and focuses its inline input ("Know more? Type it, press Enter"), which also takes screenshots by paperclip, paste or drop; a screenshot alone is a valid note. Under the input, notes and claims are grouped into Notes in review, Facts we rely on, Answered (with the maintainer's reply) and a folded Archived list. A note under the input says what happens next; a deployment can replace it via the `resourceDetailFeedbackNote` plugin slot, and can add a link to the card's own source via the new `resourceDetailCardSource` slot. Visitor feedback text is stripped of invisible characters before storage.
