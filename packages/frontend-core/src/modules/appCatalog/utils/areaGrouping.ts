import type {
  GroupingTagDefinition,
  Resource,
} from '@igstack/app-catalog-backend-core'

/**
 * Grouping of the full resource list into areas.
 *
 * The vocabulary itself is NOT here: which `category:<value>` tags exist, what
 * they are called and which of them belong on the day-to-day shelf is
 * deployment-specific. Labels come from the catalog's own tag definitions and
 * icons from `UiSettings.areas`, so the core only knows the mechanism.
 */

const CATEGORY_PREFIX = 'category:'
const EVERYONE_TAG = 'universality:everyone'

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
 * `dayToDayCategories` are categories that fold into the day-to-day group
 * instead of getting an area of their own (perks, office services, …).
 */
export function groupByArea(
  apps: Resource[],
  dayToDayCategories: readonly string[] = [],
): [string, Resource[]][] {
  const folded = new Set(dayToDayCategories)
  const dayToDay: Resource[] = []
  const byCategory = new Map<string, Resource[]>()

  for (const app of apps) {
    const key = categoryOf(app)
    if (app.tags?.includes(EVERYONE_TAG) || folded.has(key)) {
      dayToDay.push(app)
      continue
    }
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
