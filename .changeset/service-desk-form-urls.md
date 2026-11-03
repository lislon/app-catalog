---
'@igstack/app-catalog-frontend-core': minor
'@igstack/app-catalog-test-kit': minor
---

Service Desks is flat: every entry is a form, and its card lives at `/service-desks/<slug>` (the desk's key and the form's id). There is no desk-level card. With no search the view lists every form by area; desks that offer no forms are plain links at the end. Old `?desk=&form=` links redirect to the new address.
