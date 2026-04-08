import { getDbClient } from '../../db/client'
import type { Prisma } from '../../generated/prisma/client'
import type {
  AppApprovalMethod,
  AppCatalogData,
  AppCategory,
  GroupingTagDefinition,
  Resource,
} from '../../types/common/appCatalogTypes'
import type {
  CustomConfig,
  ServiceConfig,
} from '../../types/common/approvalMethodTypes'
import type { Group, Person } from '../../types/common/personGroupTypes'
import { omit } from 'radashi'
import { parseSourceSlug } from '../../utils/parseSourceSlug'

/** Prisma query result for DbResource with sourceRefs included (used by rowToResource) */
type ResourceRowWithSourceRefs = Prisma.DbResourceGetPayload<{
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

  // Fetch all resources to count tag usage
  const resources = await prisma.dbResource.findMany({
    select: { tags: true },
  })

  // Count tag values across all resources
  const tagCounts = new Map<string, Map<string, number>>()

  for (const resource of resources) {
    const tags = (resource.tags as unknown as string[] | null) ?? []
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

  // Fetch all approval methods
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
          type: 'service' as const,
          config: config as ServiceConfig,
        }
      case 'custom':
        return {
          ...baseFields,
          type: 'custom' as const,
          config: config as CustomConfig,
        }
      case 'noAccessRequired':
        return {
          ...baseFields,
          type: 'noAccessRequired' as const,
          config: config as CustomConfig,
        }
      case 'unknown':
        return {
          ...baseFields,
          type: 'unknown' as const,
          config: config as CustomConfig,
        }
      case 'personTeam':
        // Legacy: map personTeam to custom
        return {
          ...baseFields,
          type: 'custom' as const,
          config: config as CustomConfig,
        }
    }
  })
}

function rowToResource(row: ResourceRowWithSourceRefs): Resource {
  const accessRequest =
    row.accessRequest as unknown as Resource['accessRequest']
  const teams = (row.teams as unknown as string[] | null) ?? []
  const tags = (row.tags as unknown as Resource['tags']) ?? []
  const screenshotIds =
    (row.screenshotIds as unknown as Resource['screenshotIds']) ?? []
  const sources = row.sourceRefs.map((ref) => ({
    sourceSlug: ref.sourceSlug,
    url: ref.url,
    parseDate: ref.parseDate ? ref.parseDate.toISOString() : null,
  }))
  const notes = row.notes == null ? undefined : row.notes
  const appUrl = row.appUrl == null ? undefined : row.appUrl
  const iconName = row.iconName == null ? undefined : row.iconName
  const abbreviation = row.abbreviation == null ? undefined : row.abbreviation
  const nicknames = (row.nicknames as unknown as string[] | null)?.length
    ? (row.nicknames as unknown as string[])
    : undefined
  const deprecated =
    row.deprecated == null
      ? undefined
      : (row.deprecated as unknown as Resource['deprecated'])
  const aiPrompt = row.aiPrompt == null ? undefined : row.aiPrompt
  const urlIssues = (row.urlIssues as unknown as string[] | null)?.length
    ? (row.urlIssues as unknown as string[])
    : undefined
  const tiers =
    row.tiers == null ? undefined : (row.tiers as unknown as Resource['tiers'])

  return {
    id: row.id,
    slug: row.slug,
    type: row.type,
    displayName: row.displayName,
    abbreviation,
    nicknames,
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
    aiPrompt,
    urlIssues,
    tiers,
    // Fields from former SubResource
    parentSlug: row.parentSlug ?? undefined,
    tier: row.tier ?? undefined,
    familySlug: row.familySlug ?? undefined,
    aliases: row.aliases.length ? row.aliases : undefined,
    ownerPersonSlug: row.ownerPersonSlug ?? undefined,
    accessMaintainerGroupSlugs: row.accessMaintainerGroupSlugs.length
      ? row.accessMaintainerGroupSlugs
      : undefined,
    accessComments: row.accessComments ?? undefined,
    extra: row.extra
      ? (row.extra as unknown as Record<string, unknown>)
      : undefined,
  }
}

export async function getResourcesFromPrisma(): Promise<Resource[]> {
  const prisma = getDbClient()

  const rows = await prisma.dbResource.findMany({
    include: {
      sourceRefs: true,
    },
  })

  return rows.map(rowToResource)
}

/** @deprecated Use getResourcesFromPrisma instead */
export const getAppsFromPrisma = getResourcesFromPrisma

export interface UpdateAppInput {
  id: string
  data: {
    displayName?: string
    abbreviation?: string | null
    slug?: string
    appUrl?: string
    description?: string
    sources?: string[]
    aiPrompt?: string | null
  }
}

export async function updateApp(input: UpdateAppInput): Promise<Resource> {
  const prisma = getDbClient()
  const { id, data } = input

  const updatePayload: {
    displayName?: string
    abbreviation?: string | null
    slug?: string
    appUrl?: string
    description?: string
    aiPrompt?: string | null
  } = {}
  if (data.displayName !== undefined)
    updatePayload.displayName = data.displayName
  if (data.abbreviation !== undefined)
    updatePayload.abbreviation = data.abbreviation
  if (data.slug !== undefined) updatePayload.slug = data.slug
  if (data.appUrl !== undefined) updatePayload.appUrl = data.appUrl
  if (data.description !== undefined)
    updatePayload.description = data.description
  if (data.aiPrompt !== undefined) updatePayload.aiPrompt = data.aiPrompt

  const updated = await prisma.dbResource.update({
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
      where: { resourceId: updated.id },
    })

    if (urls.length > 0) {
      await prisma.sourceReference.createMany({
        data: urls.map((url) => ({
          resourceId: updated.id,
          sourceSlug: parseSourceSlug(url),
          url: url.trim(),
        })),
      })
    }

    const refetched = await prisma.dbResource.findUnique({
      where: { id },
      include: { sourceRefs: true },
    })
    if (!refetched) throw new Error('Resource not found after update')
    return rowToResource(refetched)
  }

  return rowToResource(updated)
}

export function deriveCategories(resources: Resource[]): AppCategory[] {
  const tagSet = new Set<string>()
  for (const resource of resources) {
    for (const tag of resource.tags ?? []) {
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

export async function getPersonsFromPrisma(): Promise<Person[]> {
  const prisma = getDbClient()
  const rows = await prisma.dbPerson.findMany()
  return rows.map((row) => ({
    slug: row.slug,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email ?? undefined,
  }))
}

export async function getGroupsFromPrisma(): Promise<Group[]> {
  const prisma = getDbClient()
  const rows = await prisma.dbGroup.findMany({
    include: { memberships: true },
  })
  return rows.map((row) => ({
    slug: row.slug,
    displayName: row.displayName ?? undefined,
    email: row.email ?? undefined,
    memberSlugs: row.memberships.map((m) => m.personSlug),
  }))
}

export async function getAppCatalogData(
  getResourcesOptional?: () => Promise<Resource[]>,
): Promise<AppCatalogData> {
  const resources = getResourcesOptional
    ? await getResourcesOptional()
    : await getResourcesFromPrisma()

  return {
    resources,
    tagsDefinitions: await getGroupingTagDefinitionsFromPrisma(),
    approvalMethods: await getApprovalMethodsFromPrisma(),
    persons: await getPersonsFromPrisma(),
    groups: await getGroupsFromPrisma(),
  }
}
