import Rand from 'rand-seed'

export function makeResourceSlugFromAppAndPage(
  app: { slug: string; ui?: { pages?: { slug: string }[] } },
  page: { slug: string },
) {
  const singlePageApp = app.ui?.pages?.length === 1
  return (singlePageApp ? app.slug : app.slug + '-' + page.slug).toLowerCase()
}

export function getResourcesFromApp(app: {
  slug: string
  ui?: { pages?: { slug: string }[] }
}): string[] {
  return (
    app.ui?.pages?.map((page) => {
      return makeResourceSlugFromAppAndPage(app, page)
    }) || []
  )
}

/**
 * Simple demo utility for generating test data
 */
export function getRandomSeed(seed: string): number {
  const rand = new Rand(seed)
  return rand.next()
}
