---
'@igstack/app-catalog-backend-core': minor
'@igstack/app-catalog-frontend-core': minor
'@igstack/app-catalog-test-kit': minor
---

Entries carry claims: plain statements with a date, an origin, and a status (active, in review, or archived with a reason). They are stored, synced and shown on the Documentation tab under Sources. The card's band button is replaced by an inline input at the foot of every tab ("Know more? Type it, press Enter") that sends feedback in place. A note under it says what happens next; a deployment can replace it via the `resourceDetailFeedbackNote` plugin slot. Visitor feedback text is stripped of invisible characters before storage.
