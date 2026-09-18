import type {
  GroupingTagDefinition,
  Resource,
} from '@igstack/app-catalog-backend-core'

/**
 * Grouping of the full resource list into areas.
 *
 * The vocabulary itself is NOT here: which `category:<value>` tags exist and
 * what they are called is deployment-specific. Labels come from the catalog's
 * own tag definitions and icons from `UiSettings.areas`, so the core only knows
 * the mechanism.
 */

const CATEGORY_PREFIX = 'category:'

/**
 * Opt-in to the day-to-day shelf. Placement only — it says where a resource is
 * surfaced, never what it is or how many people use it, so it is independent of
 * both `category:` and any reach/audience facet the catalog may declare.
 */
export const DAY_TO_DAY_TAG = 'placement:day-to-day'

/**
 * Synthetic key for the merged first group. Underscored so it cannot collide
 * with a real `category:<value>`.
 */
export const DAY_TO_DAY_AREA_KEY = '__day-to-day__'

/** Fallback area for resources carrying no `category:` tag. */
export const OTHER_AREA_KEY = 'other'

export const categoryOf = (app: Resource): string =>
  app.tags
    ?.find((t) => t.startsWith(CATEGORY_PREFIX))
    ?.slice(CATEGORY_PREFIX.length) ?? OTHER_AREA_KEY

const humanize = (key: string): string => {
  const words = key.replace(/[-_]+/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/**
 * Day-to-day tools first, then one area per category, biggest area first.
 * Input order is preserved inside each group.
 *
 * The shelf is **additive**: a `placement:day-to-day` resource is a shortcut at
 * the top *and* still listed under its own category. Hoisting it out instead
 * silently emptied categories of their best-known members.
 */
export function groupByArea(apps: Resource[]): [string, Resource[]][] {
  const dayToDay: Resource[] = []
  const byCategory = new Map<string, Resource[]>()

  for (const app of apps) {
    if (app.tags?.includes(DAY_TO_DAY_TAG)) dayToDay.push(app)
    const key = categoryOf(app)
    const list = byCategory.get(key)
    if (list) list.push(app)
    else byCategory.set(key, [app])
  }

  const areas = [...byCategory.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  )
  return dayToDay.length
    ? [[DAY_TO_DAY_AREA_KEY, dayToDay] as [string, Resource[]], ...areas]
    : areas
}

/**
 * Title for an area. The catalog's `category` tag definition supplies the
 * display names; an unknown value still gets a readable humanized slug.
 */
export function areaLabel(
  key: string,
  tagsDefinitions: readonly GroupingTagDefinition[] = [],
  dayToDayLabel = 'Day-to-day tools',
): string {
  if (key === DAY_TO_DAY_AREA_KEY) return dayToDayLabel
  const defined = tagsDefinitions
    .find((d) => d.prefix === 'category')
    ?.values.find((v) => v.value === key)?.displayName
  return defined || humanize(key)
}
