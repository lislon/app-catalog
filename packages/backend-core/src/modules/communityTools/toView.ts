import type { User } from 'better-auth/types'
import type {
  CommunityTag,
  CommunityTool,
  PersonRef,
} from '@igstack/app-catalog-shared-core'
import { isCaptureAllowed, lifecycleOf } from '@igstack/app-catalog-shared-core'
import type { DbPerson, Prisma } from '../../generated/prisma/client'
import type { CaptureDeps } from './healthJob'
import { computeCanEdit } from './service'

/** The likes a view reads: newest first, for "Liked by". */
export const LIKES = {
  orderBy: { createdAt: 'desc' },
  select: { userId: true, userName: true },
} as const satisfies Prisma.DbCommunityTool$likesArgs

/** Visitors' comments, counted in the same query: a review line the system writes has a `kind`. */
export const COMMENTS = {
  select: { feedback: { where: { kind: null } } },
} as const satisfies Prisma.DbCommunityToolCountOutputTypeDefaultArgs

/** How many likers a view names; the rest are a count. */
const LIKED_BY_NAMES = 8

type DbToolWithRelations = Prisma.DbCommunityToolGetPayload<{
  include: {
    owners: true
    namedOwners: true
    tags: true
    likes: typeof LIKES
    _count: typeof COMMENTS
  }
}>

export async function toView(
  tool: DbToolWithRelations,
  personMap: Map<string, DbPerson>,
  viewCounts: { views30d: number; viewsAll: number },
  user: User | null,
  isAdmin: boolean,
  now: Date,
  capture: CaptureDeps,
): Promise<CommunityTool> {
  const owners: PersonRef[] = tool.owners.map((o) => {
    const person = personMap.get(o.personSlug)
    if (person) {
      const name = `${person.firstName} ${person.lastName}`.trim()
      return { slug: o.personSlug, name: name || o.personSlug }
    }
    return { slug: o.personSlug, name: o.personSlug }
  })
  // Outside the directory: a name to ask for, never an editor.
  for (const o of tool.namedOwners) owners.push({ slug: null, name: o.name })

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
      unreachableSince: tool.unreachableSince,
    },
    now,
  )

  // Never visited yet, and a visit will come: the same conditions `checkTool`
  // runs under. A finished visit sets `lastCheckAt`, failed or not.
  const capturePending =
    !tool.screenshotAssetId &&
    !tool.lastCheckAt &&
    capture.capturer !== null &&
    isCaptureAllowed(tool.url, capture.captureHosts)

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
    comments: tool._count.feedback,
    // ponytail: every like row is read per view; a counted column if likes run to thousands.
    likes: tool.likes.length,
    likedByMe: !!user && tool.likes.some((l) => l.userId === user.id),
    // The viewer's own like is `likedByMe`; the names are everyone else's.
    likedBy: tool.likes
      .filter((l) => l.userId !== user?.id)
      .slice(0, LIKED_BY_NAMES)
      .map((l) => l.userName),
    siteUpdatedAt: tool.siteUpdatedAt?.toISOString() ?? null,
    tags,
    views30d: viewCounts.views30d,
    viewsAll: viewCounts.viewsAll,
    reviewed: tool.reviewedAt !== null,
    lifecycle,
    screenshotId: tool.screenshotAssetId ?? null,
    faviconId: tool.faviconAssetId ?? null,
    capturedAt: tool.capturedAt?.toISOString() ?? null,
    capturePending,
    serverUnreachable: tool.unreachableSince !== null,
    canEdit,
  }
}
