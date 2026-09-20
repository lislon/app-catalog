import { describe, expect, it } from 'vitest'

import { Route as AppRoute } from '~/routes/_layout/app.$slug'
import { Route as SubResourceRoute } from '~/routes/_layout/app.$slug_.sub.$subSlug'
import { Route as CatalogIndexRoute } from '~/routes/_layout/index'

// #152. These three routes render nothing -- `_layout` owns the page -- and they
// must stay synchronous. A loader here, even one that returns `{}`, makes every
// navigation to the route async: a `?qj=`/`?sub=`/`?filterTag=` change re-runs
// it, the match goes pending, and the detail panel is unmounted and rebuilt.
// That erases what the user typed into Quick Jump and refetches the catalog.
//
// The Quick Jump integration test does NOT catch this: in jsdom the harness
// resolves the navigation without the remount, so it passes either way.
describe('catalog routes', () => {
  it.each([
    ['/_layout/', CatalogIndexRoute],
    ['/_layout/app/$slug', AppRoute],
    ['/_layout/app/$slug_/sub/$subSlug', SubResourceRoute],
  ])('%s declares no loader', (_id, route) => {
    expect(route.options.loader).toBeUndefined()
  })
})
