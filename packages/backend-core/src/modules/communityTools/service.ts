import type { User } from 'better-auth/types'
import { getDbClient } from '../../db/client'
import type { Actor } from '../visitor/visitorIdentity'
import type { CommunityTool } from '@igstack/app-catalog-shared-core'
import { toView } from './toView'

export async function listTools(
  user: User | null,
  isAdmin: boolean,
  now: Date,
): Promise<CommunityTool[]> {
  const db = getDbClient()

  const tools = await db.dbCommunityTool.findMany({
    include: {
      owners: true,
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

  // Get view counts for all tools
  const today = new Date(now)
  today.setUTCHours(0, 0, 0, 0)
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29)

  const viewCounts = await Promise.all(
    toolIds.map(async (toolId) => {
      const [views30d, viewsAll] = await Promise.all([
        db.dbCommunityToolView.count({
          where: { toolId, day: { gte: thirtyDaysAgo } },
        }),
        db.dbCommunityToolView.count({ where: { toolId } }),
      ])
      return { toolId, views30d, viewsAll }
    }),
  )
  const viewCountMap = new Map(
    viewCounts.map((v) => [
      v.toolId,
      { views30d: v.views30d, viewsAll: v.viewsAll },
    ]),
  )

  return Promise.all(
    tools.map((tool) =>
      toView(tool, personMap, viewCountMap.get(tool.id)!, user, isAdmin, now),
    ),
  )
}

export async function getTool(
  slug: string,
  user: User | null,
  isAdmin: boolean,
  now: Date,
): Promise<CommunityTool | null> {
  const db = getDbClient()

  const tool = await db.dbCommunityTool.findUnique({
    where: { slug },
    include: {
      owners: true,
      tags: true,
    },
  })

  if (!tool) return null

  const ownerSlugs = tool.owners.map((o) => o.personSlug)
  const persons = await db.dbPerson.findMany({
    where: { slug: { in: ownerSlugs } },
  })
  const personMap = new Map(persons.map((p) => [p.slug, p]))

  const today = new Date(now)
  today.setUTCHours(0, 0, 0, 0)
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29)

  const [views30d, viewsAll] = await Promise.all([
    db.dbCommunityToolView.count({
      where: { toolId: tool.id, day: { gte: thirtyDaysAgo } },
    }),
    db.dbCommunityToolView.count({ where: { toolId: tool.id } }),
  ])

  return toView(tool, personMap, { views30d, viewsAll }, user, isAdmin, now)
}

export async function recordView(
  slug: string,
  actor: Actor,
  user: User | null,
  now: Date,
): Promise<{ views30d: number; viewsAll: number }> {
  const db = getDbClient()

  const tool = await db.dbCommunityTool.findUnique({ where: { slug } })
  if (!tool) {
    throw new Error('Tool not found')
  }

  const day = new Date(now)
  day.setUTCHours(0, 0, 0, 0)

  await db.dbCommunityToolView.upsert({
    where: {
      toolId_actorHash_day: {
        toolId: tool.id,
        actorHash: actor.hash,
        day,
      },
    },
    create: {
      toolId: tool.id,
      actorHash: actor.hash,
      userId: user?.id ?? null,
      day,
      at: now,
    },
    update: {
      at: now,
      userId: user?.id ?? null,
    },
  })

  const thirtyDaysAgo = new Date(day)
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29)

  const [views30d, viewsAll] = await Promise.all([
    db.dbCommunityToolView.count({
      where: { toolId: tool.id, day: { gte: thirtyDaysAgo } },
    }),
    db.dbCommunityToolView.count({ where: { toolId: tool.id } }),
  ])

  return { views30d, viewsAll }
}

export async function listRecent(
  userId: string,
  user: User | null,
  isAdmin: boolean,
  now: Date,
): Promise<CommunityTool[]> {
  const db = getDbClient()

  // Get last 5 distinct tools viewed by this user
  const recentViews = await db.dbCommunityToolView.findMany({
    where: { userId },
    orderBy: { at: 'desc' },
    take: 100, // Take more to get 5 distinct
    include: { tool: true },
  })

  // Get 5 distinct tools
  const seen = new Set<string>()
  const distinctTools: (typeof recentViews)[0]['tool'][] = []
  for (const view of recentViews) {
    if (!seen.has(view.toolId)) {
      seen.add(view.toolId)
      distinctTools.push(view.tool)
      if (distinctTools.length === 5) break
    }
  }

  const toolIds = distinctTools.map((t) => t.id)

  // Fetch related data
  const owners = await db.dbCommunityToolOwner.findMany({
    where: { toolId: { in: toolIds } },
  })

  const [tags, persons] = await Promise.all([
    db.dbCommunityToolTag.findMany({
      where: { toolId: { in: toolIds } },
    }),
    db.dbPerson.findMany({
      where: {
        slug: {
          in: owners.map((o) => o.personSlug),
        },
      },
    }),
  ])

  const ownerMap = new Map<string, typeof owners>()
  for (const owner of owners) {
    if (!ownerMap.has(owner.toolId)) {
      ownerMap.set(owner.toolId, [])
    }
    ownerMap.get(owner.toolId)!.push(owner)
  }

  const tagMap = new Map<string, typeof tags>()
  for (const tag of tags) {
    if (!tagMap.has(tag.toolId)) {
      tagMap.set(tag.toolId, [])
    }
    tagMap.get(tag.toolId)!.push(tag)
  }

  const personMap = new Map(persons.map((p) => [p.slug, p]))

  const today = new Date(now)
  today.setUTCHours(0, 0, 0, 0)
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29)

  const viewCounts = await Promise.all(
    toolIds.map(async (toolId) => {
      const [views30d, viewsAll] = await Promise.all([
        db.dbCommunityToolView.count({
          where: { toolId, day: { gte: thirtyDaysAgo } },
        }),
        db.dbCommunityToolView.count({ where: { toolId } }),
      ])
      return { toolId, views30d, viewsAll }
    }),
  )
  const viewCountMap = new Map(
    viewCounts.map((v) => [
      v.toolId,
      { views30d: v.views30d, viewsAll: v.viewsAll },
    ]),
  )

  return Promise.all(
    distinctTools.map((tool) => {
      const toolWithRelations = {
        ...tool,
        owners: ownerMap.get(tool.id) || [],
        tags: tagMap.get(tool.id) || [],
      }
      const counts = viewCountMap.get(tool.id) || { views30d: 0, viewsAll: 0 }
      return toView(toolWithRelations, personMap, counts, user, isAdmin, now)
    }),
  )
}

export async function listPins(
  userId: string,
  user: User | null,
  isAdmin: boolean,
  now: Date,
): Promise<CommunityTool[]> {
  const db = getDbClient()

  const pins = await db.dbCommunityToolPin.findMany({
    where: { userId },
    orderBy: { position: 'asc' },
    include: {
      tool: {
        include: {
          owners: true,
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

  const today = new Date(now)
  today.setUTCHours(0, 0, 0, 0)
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29)

  const viewCounts = await Promise.all(
    toolIds.map(async (toolId) => {
      const [views30d, viewsAll] = await Promise.all([
        db.dbCommunityToolView.count({
          where: { toolId, day: { gte: thirtyDaysAgo } },
        }),
        db.dbCommunityToolView.count({ where: { toolId } }),
      ])
      return { toolId, views30d, viewsAll }
    }),
  )
  const viewCountMap = new Map(
    viewCounts.map((v) => [
      v.toolId,
      { views30d: v.views30d, viewsAll: v.viewsAll },
    ]),
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
      ),
    ),
  )
}

export async function pinTool(slug: string, userId: string): Promise<void> {
  const db = getDbClient()

  const tool = await db.dbCommunityTool.findUnique({ where: { slug } })
  if (!tool) {
    throw new Error('Tool not found')
  }

  // Get current max position
  const maxPin = await db.dbCommunityToolPin.findFirst({
    where: { userId },
    orderBy: { position: 'desc' },
  })

  const nextPosition = maxPin ? maxPin.position + 1 : 0

  await db.dbCommunityToolPin.create({
    data: {
      userId,
      toolId: tool.id,
      position: nextPosition,
    },
  })
}

export async function unpinTool(slug: string, userId: string): Promise<void> {
  const db = getDbClient()

  const tool = await db.dbCommunityTool.findUnique({ where: { slug } })
  if (!tool) {
    throw new Error('Tool not found')
  }

  await db.dbCommunityToolPin.delete({
    where: {
      userId_toolId: {
        userId,
        toolId: tool.id,
      },
    },
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
  })

  // Create a map of slug to tool id
  const slugToId = new Map(pins.map((p) => [p.tool.slug, p.toolId]))

  // Delete all pins and recreate them in the new order
  await db.dbCommunityToolPin.deleteMany({ where: { userId } })

  await Promise.all(
    slugs.map((slug, index) => {
      const toolId = slugToId.get(slug)
      if (!toolId) return Promise.resolve()
      return db.dbCommunityToolPin.create({
        data: {
          userId,
          toolId,
          position: index,
        },
      })
    }),
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
