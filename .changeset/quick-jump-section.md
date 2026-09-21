---
'@igstack/app-catalog-backend-core': minor
'@igstack/app-catalog-frontend-core': minor
---

Quick Jump: paste an id on a resource card and open the matching page

A resource can now carry deep links that take an identifier. Each entry names
the identifier in human words, the link title, and a url template with at most
two placeholders — `{{baseHost}}` (the resource's own `appUrl`, trailing slash
trimmed) and `{{value}}` (the typed id, url-encoded exactly once):

```ts
quickJumps: [
  { identity: 'Case Id', title: 'View case', url: '{{baseHost}}/case/{{value}}' },
  { identity: 'Case Id', title: 'Audit log', url: '{{baseHost}}/audit?case={{value}}' },
]
```

The detail panel groups them by `identity` — one column per identifier, in the
order the data declares, with one input above its jumps. A jump is a dead,
dashed placeholder until its input has a value, then becomes a real link that
opens in a new tab; Enter in the input opens the column's first jump. A jump
whose template needs a host on a resource that has no `appUrl` is dropped
rather than rendered broken.

Two per-user display choices live in `localStorage` (`ac:quickjump:<slug>`), so
they cost no table and no authenticated route: which identifiers to show —
picked in a **Configure (shown/total)** popover, defaulting to the first one —
and whether to pin the section to the top of the card.

`identity` is the label itself, so there is no dictionary to register: naming
the same identifier on two resources is what links them, and the input's
autofill key is derived from it, so the browser offers ids you typed elsewhere.

Resources without `quickJumps` render exactly as before. `#143`
