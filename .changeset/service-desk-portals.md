---
'@igstack/app-catalog-backend-core': minor
'@igstack/app-catalog-frontend-core': minor
'@igstack/app-catalog-test-kit': minor
---

Service Desks view searches every desk's forms. A `service` approval method can carry a `portal`: its key, area, request forms and the fields each form asks for. Search ranks a key match first, then the desk name, then descriptions, then dropdown options, and rereads queries typed on the Cyrillic keyboard layout. With no search, desks are grouped by area with a contents list. A desk's card (Overview and Behind this card) opens from a result and lives in the URL (`?desk=&form=`). Portals ride on the new `appCatalog.getServiceDesks` query; `appCatalog.getData` leaves them out.
