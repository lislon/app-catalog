---
'@igstack/app-catalog-frontend-core': minor
---

Add a "Service Desks" view. A compact "Apps | Service Desks" segmented toggle in
the header (no added height) switches between the app catalog (/) and a new
/service-desks route. The Service Desks page lists all service-desk approval
methods (type 'service') in a searchable table, each with a link that opens its
portal in a new tab. Data rides in on the existing app-catalog query — no
backend change.
