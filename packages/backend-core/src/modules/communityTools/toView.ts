import type { User } from 'better-auth/types'
import type {
  CommunityTag,
  CommunityTool,
  PersonRef,
} from '@igstack/app-catalog-shared-core'
import { lifecycleOf } from '@igstack/app-catalog-shared-core'
import type { DbPerson, Prisma } from '../../generated/prisma/client'
import { computeCanEdit } from './service'

type DbToolWithRelations = Prisma.DbCommunityToolGetPayload<{
  include: {
    owners: true
    tags: true
  }
}>

export async function toView(
  tool: DbToolWithRelations,
  personMap: Map<string, DbPerson>,
  viewCounts: { views30d: number; viewsAll: number },
  user: User | null,
  isAdmin: boolean,
  now: Date,
): Promise<CommunityTool> {
  const owners: PersonRef[] = tool.owners.map((o) => {
    const person = personMap.get(o.personSlug)
    if (person) {
      const name = `${person.firstName} ${person.lastName}`.trim()
      return { slug: o.personSlug, name: name || o.personSlug }
    }
    return { slug: o.personSlug, name: o.personSlug }
  })

  const tags: CommunityTag[] = tool.tags.map((t) => ({
    kind: t.kind,
    value: t.value,
  }))

  const lifecycle = lifecycleOf(
    {
      failingSince: tool.failingSince,
      archivedAt: tool.archivedAt,
      archivedBy: tool.archivedBy,
      archivedReason: tool.archivedReason,
    },
    now,
  )

  const canEdit = await computeCanEdit(
    { id: tool.id, addedByUserId: tool.addedByUserId },
    user,
    isAdmin,
  )

  return {
    slug: tool.slug,
    name: tool.name,
    url: tool.url,
    host: tool.host,
    summary: tool.summary,
    descriptionMd: tool.descriptionMd,
    owners,
    addedBy: {
      userId: tool.addedByUserId,
      name: tool.addedByName,
    },
    createdAt: tool.createdAt.toISOString(),
    tags,
    views30d: viewCounts.views30d,
    viewsAll: viewCounts.viewsAll,
    reviewed: tool.reviewedAt !== null,
    lifecycle,
    screenshotId: tool.screenshotAssetId ?? null,
    faviconId: tool.faviconAssetId ?? null,
    capturedAt: tool.capturedAt?.toISOString() ?? null,
    canEdit,
  }
}
