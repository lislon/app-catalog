import { TRPCError } from '@trpc/server'
import type { User } from 'better-auth/types'
import { getDbClient } from '../../db/client'
import type { Actor } from '../visitor/visitorIdentity'
import type { CommunityTool } from '@igstack/app-catalog-shared-core'
import type { CaptureDeps } from './healthJob'
import { COMMENTS, LIKES, toView } from './toView'

export async function listTools(
  user: User | null,
  isAdmin: boolean,
  now: Date,
  capture: CaptureDeps,
): Promise<CommunityTool[]> {
  const db = getDbClient()

  const tools = await db.dbCommunityTool.findMany({
    include: {
      owners: true,
      namedOwners: true,
      likes: LIKES,
      _count: COMMENTS,
      tags: true,
    },
  })

  const toolIds = tools.map((t) => t.id)

  // Fetch all persons in one query
  const ownerSlugs = tools.flatMap((t) => t.owners.map((o) => o.personSlug))
  const uniqueOwnerSlugs = Array.from(new Set(ownerSlugs))
  const persons = await db.dbPerson.findMany({
    where: { slug: { in: uniqueOwnerSlugs } },
  })
  const personMap = new Map(persons.map((p) => [p.slug, p]))

  const viewCountMap = new Map(
    await Promise.all(
      toolIds.map(async (id) => [id, await openCounts(id, now)] as const),
    ),
  )

  return Promise.all(
    tools.map((tool) =>
      toView(
        tool,
        personMap,
        viewCountMap.get(tool.id)!,
        user,
        isAdmin,
        now,
        capture,
      ),
    ),
  )
}

/** How many live tools carry each official app's tag, by app slug. */
export async function countByApp(): Promise<Record<string, number>> {
  const rows = await getDbClient().dbCommunityToolTag.groupBy({
    by: ['value'],
    where: { kind: 'app', tool: { archivedAt: null } },
    _count: { _all: true },
  })
  return Object.fromEntries(rows.map((r) => [r.value, r._count._all]))
}

export async function getTool(
  slug: string,
  user: User | null,
  isAdmin: boolean,
  now: Date,
  capture: CaptureDeps,
): Promise<CommunityTool | null> {
  const db = getDbClient()

  const tool = await db.dbCommunityTool.findUnique({
    where: { slug },
    include: {
      owners: true,
      namedOwners: true,
      likes: LIKES,
      _count: COMMENTS,
      tags: true,
    },
  })

  if (!tool) return null

  const ownerSlugs = tool.owners.map((o) => o.personSlug)
  const persons = await db.dbPerson.findMany({
    where: { slug: { in: ownerSlugs } },
  })
  const personMap = new Map(persons.map((p) => [p.slug, p]))

  return toView(
    tool,
    personMap,
    await openCounts(tool.id, now),
    user,
    isAdmin,
    now,
    capture,
  )
}

/** Opens since the first of the last 30 UTC days, and ever. */
async function openCounts(
  toolId: string,
  now: Date,
): Promise<{ views30d: number; viewsAll: number }> {
  const db = getDbClient()
  const since = new Date(now)
  since.setUTCHours(0, 0, 0, 0)
  since.setUTCDate(since.getUTCDate() - 29)
  const [views30d, viewsAll] = await Promise.all([
    db.dbCommunityToolOpen.count({ where: { toolId, at: { gte: since } } }),
    db.dbCommunityToolOpen.count({ where: { toolId } }),
  ])
  return { views30d, viewsAll }
}

/** More opens than this by one visitor of one tool in a minute are ignored. */
const OPENS_PER_MINUTE = 30

/**
 * Counts one card open or click through to the site: every one counts, short
 * of a visitor opening the same tool more than OPENS_PER_MINUTE times a minute.
 */
export async function recordOpen(
  slug: string,
  kind: 'card' | 'site',
  actor: Actor,
  user: User | null,
  now: Date,
): Promise<{ views30d: number; viewsAll: number }> {
  const db = getDbClient()
  const toolId = await requireToolId(slug)

  const recent = await db.dbCommunityToolOpen.count({
    where: {
      toolId,
      actorHash: actor.hash,
      at: { gt: new Date(now.getTime() - 60_000) },
    },
  })
  if (recent < OPENS_PER_MINUTE) {
    await db.dbCommunityToolOpen.create({
      data: {
        toolId,
        kind,
        actorHash: actor.hash,
        userId: user?.id ?? null,
        at: now,
      },
    })
  }
  return openCounts(toolId, now)
}

export async function listPins(
  userId: string,
  user: User | null,
  isAdmin: boolean,
  now: Date,
  capture: CaptureDeps,
): Promise<CommunityTool[]> {
  const db = getDbClient()

  const pins = await db.dbCommunityToolPin.findMany({
    where: { userId },
    orderBy: { position: 'asc' },
    include: {
      tool: {
        include: {
          owners: true,
          namedOwners: true,
          likes: LIKES,
          _count: COMMENTS,
          tags: true,
        },
      },
    },
  })

  const toolIds = pins.map((p) => p.tool.id)

  const ownerSlugs = pins.flatMap((p) => p.tool.owners.map((o) => o.personSlug))
  const uniqueOwnerSlugs = Array.from(new Set(ownerSlugs))
  const persons = await db.dbPerson.findMany({
    where: { slug: { in: uniqueOwnerSlugs } },
  })
  const personMap = new Map(persons.map((p) => [p.slug, p]))

  const viewCountMap = new Map(
    await Promise.all(
      toolIds.map(async (id) => [id, await openCounts(id, now)] as const),
    ),
  )

  return Promise.all(
    pins.map((pin) =>
      toView(
        pin.tool,
        personMap,
        viewCountMap.get(pin.tool.id)!,
        user,
        isAdmin,
        now,
        capture,
      ),
    ),
  )
}

async function requireToolId(slug: string): Promise<string> {
  const tool = await getDbClient().dbCommunityTool.findUnique({
    where: { slug },
    select: { id: true },
  })
  if (!tool) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Tool not found' })
  }
  return tool.id
}

/** Pinning a pinned tool leaves it where it is. */
export async function pinTool(slug: string, userId: string): Promise<void> {
  const db = getDbClient()
  const toolId = await requireToolId(slug)

  const maxPin = await db.dbCommunityToolPin.findFirst({
    where: { userId },
    orderBy: { position: 'desc' },
  })

  await db.dbCommunityToolPin.upsert({
    where: { userId_toolId: { userId, toolId } },
    create: { userId, toolId, position: maxPin ? maxPin.position + 1 : 0 },
    update: {},
  })
}

/** Prisma's unique-constraint error. */
function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as { code: unknown }).code === 'P2002'
  )
}

/** Liking twice is one like. */
export async function likeTool(
  slug: string,
  user: { id: string; name: string },
): Promise<void> {
  const toolId = await requireToolId(slug)
  try {
    await getDbClient().dbCommunityToolLike.upsert({
      where: { toolId_userId: { toolId, userId: user.id } },
      create: { toolId, userId: user.id, userName: user.name },
      update: {},
    })
  } catch (error) {
    // Two likes at once both miss, and one insert loses the race: still liked.
    if (!isUniqueViolation(error)) throw error
  }
}

/** Unliking what was never liked changes nothing. */
export async function unlikeTool(slug: string, userId: string): Promise<void> {
  const toolId = await requireToolId(slug)
  await getDbClient().dbCommunityToolLike.deleteMany({
    where: { toolId, userId },
  })
}

export async function unpinTool(slug: string, userId: string): Promise<void> {
  const toolId = await requireToolId(slug)
  await getDbClient().dbCommunityToolPin.deleteMany({
    where: { userId, toolId },
  })
}

export async function reorderPins(
  slugs: string[],
  userId: string,
): Promise<void> {
  const db = getDbClient()

  // Get all pins for this user
  const pins = await db.dbCommunityToolPin.findMany({
    where: { userId },
    include: { tool: true },
    orderBy: { position: 'asc' },
  })

  // Create a map of slug to pin
  const slugToPin = new Map(pins.map((p) => [p.tool.slug, p]))

  // Build new order: named slugs first, then unlisted pins in current order
  const namedPins = slugs
    .map((slug) => slugToPin.get(slug))
    .filter((p) => p !== undefined)
  const unlistedPins = pins.filter((p) => !slugs.includes(p.tool.slug))
  const newOrder = [...namedPins, ...unlistedPins]

  // Update positions
  await Promise.all(
    newOrder.map((pin, index) =>
      db.dbCommunityToolPin.update({
        where: {
          userId_toolId: {
            userId,
            toolId: pin.toolId,
          },
        },
        data: { position: index },
      }),
    ),
  )
}

export async function computeCanEdit(
  tool: { id: string; addedByUserId: string },
  user: User | null,
  isAdmin: boolean,
): Promise<boolean> {
  if (!user) return false
  if (isAdmin) return true
  if (tool.addedByUserId === user.id) return true

  const db = getDbClient()
  const owners = await db.dbCommunityToolOwner.findMany({
    where: { toolId: tool.id },
  })

  return owners.some((o: { personSlug: string }) => o.personSlug === user.email)
}
