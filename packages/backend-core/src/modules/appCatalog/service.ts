import { getDbClient } from '../../db/client'
import type { Prisma } from '../../generated/prisma/client'
import type {
  AppApprovalMethod,
  AppCatalogData,
  AppCategory,
  AppForCatalog,
  GroupingTagDefinition,
} from '../../types/common/appCatalogTypes'
import type {
  CustomConfig,
  PersonTeamConfig,
  ServiceConfig,
} from '../../types/common/approvalMethodTypes'
import { omit } from 'radashi'
import { parseSourceSlug } from '../../utils/parseSourceSlug'

/** Prisma query result for DbAppForCatalog with sourceRefs included (used by rowToAppForCatalog) */
type AppRowWithSourceRefs = Prisma.DbAppForCatalogGetPayload<{
  include: { sourceRefs: true }
}>

function capitalize(word: string): string {
  if (!word) return word
  return word.charAt(0).toUpperCase() + word.slice(1)
}

export async function getGroupingTagDefinitionsFromPrisma(): Promise<
  GroupingTagDefinition[]
> {
  const prisma = getDbClient()

  // Fetch all tag definitions
  const rows = await prisma.dbAppTagDefinition.findMany()

  // Fetch all apps to count tag usage
  const apps = await prisma.dbAppForCatalog.findMany({
    select: { tags: true },
  })

  // Count tag values across all apps
  const tagCounts = new Map<string, Map<string, number>>()

  for (const app of apps) {
    const tags = (app.tags as unknown as string[] | null) ?? []
    for (const tag of tags) {
      const [prefix, value] = tag.split(':')
      if (prefix && value) {
        if (!tagCounts.has(prefix)) {
          tagCounts.set(prefix, new Map())
        }
        const prefixCounts = tagCounts.get(prefix)!
        prefixCounts.set(value, (prefixCounts.get(value) ?? 0) + 1)
      }
    }
  }

  // Sort values by count and return definitions
  return rows.map((row) => {
    const definition = omit(row, ['id', 'updatedAt', 'createdAt'])
    const counts = tagCounts.get(definition.prefix) ?? new Map()

    // Sort values by count (descending)
    const sortedValues = [...definition.values].sort((a, b) => {
      const countA = counts.get(a.value) ?? 0
      const countB = counts.get(b.value) ?? 0
      return countB - countA
    })

    return {
      ...definition,
      values: sortedValues,
    }
  })
}

export async function getApprovalMethodsFromPrisma(): Promise<
  AppApprovalMethod[]
> {
  const prisma = getDbClient()

  // Fetch all apps
  const rows = await prisma.dbApprovalMethod.findMany()

  return rows.map((row) => {
    // Handle discriminated union by explicitly narrowing based on type
    const baseFields = {
      slug: row.slug,
      displayName: row.displayName,
    }

    // Provide default empty config if null, as AppApprovalMethod discriminated union requires config
    const config = row.config ?? {}

    switch (row.type) {
      case 'service':
        return {
          ...baseFields,
          type: 'service',
          config: config as ServiceConfig,
        }
      case 'personTeam':
        return {
          ...baseFields,
          type: 'personTeam',
          config: config as PersonTeamConfig,
        }
      case 'custom':
        return { ...baseFields, type: 'custom', config: config as CustomConfig }
    }
  })
}

function rowToAppForCatalog(row: AppRowWithSourceRefs): AppForCatalog {
  const accessRequest =
    row.accessRequest as unknown as AppForCatalog['accessRequest']
  const teams = (row.teams as unknown as string[] | null) ?? []
  const tags = (row.tags as unknown as AppForCatalog['tags']) ?? []
  const screenshotIds =
    (row.screenshotIds as unknown as AppForCatalog['screenshotIds']) ?? []
  const sources = row.sourceRefs.map((ref) => ({
    sourceSlug: ref.sourceSlug,
    url: ref.url,
    parseDate: ref.parseDate ? ref.parseDate.toISOString() : null,
  }))
  const notes = row.notes == null ? undefined : row.notes
  const appUrl = row.appUrl == null ? undefined : row.appUrl
  const iconName = row.iconName == null ? undefined : row.iconName
  const alias = row.alias == null ? undefined : row.alias
  const deprecated =
    row.deprecated == null
      ? undefined
      : (row.deprecated as unknown as AppForCatalog['deprecated'])

  return {
    id: row.id,
    slug: row.slug,
    displayName: row.displayName,
    alias,
    description: row.description,
    accessRequest,
    teams,
    notes,
    tags,
    appUrl,
    iconName,
    screenshotIds,
    sources,
    deprecated,
  }
}

export async function getAppsFromPrisma(): Promise<AppForCatalog[]> {
  const prisma = getDbClient()

  const rows = await prisma.dbAppForCatalog.findMany({
    include: {
      sourceRefs: true,
    },
  })

  return rows.map(rowToAppForCatalog)
}

export interface UpdateAppInput {
  id: string
  data: {
    displayName?: string
    alias?: string | null
    slug?: string
    appUrl?: string
    description?: string
    sources?: string[]
  }
}

export async function updateApp(input: UpdateAppInput): Promise<AppForCatalog> {
  const prisma = getDbClient()
  const { id, data } = input

  const updatePayload: {
    displayName?: string
    alias?: string | null
    slug?: string
    appUrl?: string
    description?: string
  } = {}
  if (data.displayName !== undefined)
    updatePayload.displayName = data.displayName
  if (data.alias !== undefined) updatePayload.alias = data.alias
  if (data.slug !== undefined) updatePayload.slug = data.slug
  if (data.appUrl !== undefined) updatePayload.appUrl = data.appUrl
  if (data.description !== undefined)
    updatePayload.description = data.description

  const updated = await prisma.dbAppForCatalog.update({
    where: { id },
    data: updatePayload,
    include: { sourceRefs: true },
  })

  if (data.sources !== undefined) {
    const urls = [...new Set(data.sources.map((u) => u.trim()).filter(Boolean))]
    const uniqueSourceSlugs = [...new Set(urls.map(parseSourceSlug))]

    for (const sourceSlug of uniqueSourceSlugs) {
      await prisma.source.upsert({
        where: { slug: sourceSlug },
        create: { slug: sourceSlug },
        update: {},
      })
    }

    await prisma.sourceReference.deleteMany({
      where: { appId: updated.id },
    })

    if (urls.length > 0) {
      await prisma.sourceReference.createMany({
        data: urls.map((url) => ({
          appId: updated.id,
          sourceSlug: parseSourceSlug(url),
          url: url.trim(),
        })),
      })
    }

    const refetched = await prisma.dbAppForCatalog.findUnique({
      where: { id },
      include: { sourceRefs: true },
    })
    if (!refetched) throw new Error('App not found after update')
    return rowToAppForCatalog(refetched)
  }

  return rowToAppForCatalog(updated)
}

export function deriveCategories(apps: AppForCatalog[]): AppCategory[] {
  const tagSet = new Set<string>()
  for (const app of apps) {
    for (const tag of app.tags ?? []) {
      const normalized = tag.trim().toLowerCase()
      if (normalized) tagSet.add(normalized)
    }
  }
  const categories: AppCategory[] = [{ id: 'all', name: 'All' }]
  for (const tag of Array.from(tagSet).sort()) {
    categories.push({ id: tag, name: capitalize(tag) })
  }
  return categories
}

export async function getAppCatalogData(
  getAppsOptional?: () => Promise<AppForCatalog[]>,
): Promise<AppCatalogData> {
  const apps = getAppsOptional
    ? await getAppsOptional()
    : await getAppsFromPrisma()

  return {
    apps,
    tagsDefinitions: await getGroupingTagDefinitionsFromPrisma(),
    approvalMethods: await getApprovalMethodsFromPrisma(),
  }
}
