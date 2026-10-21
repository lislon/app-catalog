import { TRPCError } from '@trpc/server'
import type { User } from 'better-auth/types'
import { z } from 'zod'
import type { CommunityTool } from '@igstack/app-catalog-shared-core'
import { hostOf, isCaptureAllowed } from '@igstack/app-catalog-shared-core'
import { getDbClient } from '../../db/client'
import { resizeImage } from '../assets/assetUtils'
import type { Actor } from '../visitor/visitorIdentity'
import { checkTool } from './healthJob'
import type { CaptureDeps } from './healthJob'
import { computeCanEdit, getTool } from './service'

export const toolInputSchema = z.object({
  url: z.string().max(2000),
  name: z.string().trim().min(1).max(80),
  summary: z.string().trim().max(160),
  descriptionMd: z.string().max(5000),
  ownerSlugs: z.array(z.string()).min(1).max(5),
  tags: z
    .array(z.object({ kind: z.enum(['app', 'topic']), value: z.string() }))
    .max(8),
})

export type ToolInput = z.infer<typeof toolInputSchema>

/** The signed-in person making the change. */
export interface Writer {
  user: User
  isAdmin: boolean
  actor: Actor
}

export interface ToolPreview {
  host: string
  title: string | null
  screenshotDataUrl: string | null
  duplicate: { slug: string; name: string } | null
  captureAllowed: boolean
}

const PREVIEW_WIDTH = 640

function requireHost(url: string): string {
  const host = hostOf(url)
  if (!host) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'The address must start with http:// or https://',
    })
  }
  return host
}

async function requireTool(slug: string) {
  const tool = await getDbClient().dbCommunityTool.findUnique({
    where: { slug },
    include: { owners: true, tags: true },
  })
  if (!tool) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Tool not found' })
  }
  return tool
}

async function requireEditor(
  tool: { id: string; addedByUserId: string },
  writer: Writer,
) {
  if (!(await computeCanEdit(tool, writer.user, writer.isAdmin))) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Only an owner or an admin can change this tool',
    })
  }
}

async function requireOwnersExist(ownerSlugs: string[]) {
  const unique = Array.from(new Set(ownerSlugs))
  const found = await getDbClient().dbPerson.findMany({
    where: { slug: { in: unique } },
    select: { slug: true },
  })
  if (found.length !== unique.length) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Every owner must be in the person directory',
    })
  }
  return unique
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'tool'
  )
}

async function freeSlug(name: string): Promise<string> {
  const base = slugify(name)
  const db = getDbClient()
  for (let n = 1; ; n++) {
    const slug = n === 1 ? base : `${base}-${n}`
    if (!(await db.dbCommunityTool.findUnique({ where: { slug } }))) return slug
  }
}

/** A review row: what puts the change in the maintainer's existing comment queue. */
async function writeMarker(
  toolId: string,
  body: string,
  writer: Writer,
  status: 'applied' | 'acknowledged' | null,
) {
  await getDbClient().dbFeedback.create({
    data: {
      communityToolId: toolId,
      body,
      status,
      authorHash: writer.actor.hash,
      authorAlias: writer.actor.alias,
      authorUserId: writer.user.id,
      authorName: writer.user.name,
    },
  })
}

/** Capture in the background: publishing must not wait on a 20-second page load. */
function captureLater(
  tool: Parameters<typeof checkTool>[0],
  deps: CaptureDeps,
  now: Date,
) {
  checkTool(tool, deps, now).catch((error: unknown) => {
    console.error(`[communityTools] capture of ${tool.slug}:`, error)
  })
}

export async function previewTool(
  url: string,
  deps: CaptureDeps,
): Promise<ToolPreview> {
  const host = requireHost(url)
  const captureAllowed = isCaptureAllowed(url, deps.captureHosts)

  const duplicate = await getDbClient().dbCommunityTool.findFirst({
    where: { host },
    select: { slug: true, name: true },
  })

  let title: string | null = null
  let screenshotDataUrl: string | null = null
  if (captureAllowed && deps.capturer) {
    try {
      const result = await deps.capturer.capture(url, deps.captureHosts)
      if (result.ok) {
        title = result.title
        const jpeg = await resizeImage(
          result.png,
          PREVIEW_WIDTH,
          undefined,
          'jpeg',
        )
        screenshotDataUrl = `data:image/jpeg;base64,${jpeg.toString('base64')}`
      }
    } catch (error) {
      console.error('[communityTools] preview capture failed:', error)
    }
  }

  return { host, title, screenshotDataUrl, duplicate, captureAllowed }
}

export async function addTool(
  input: ToolInput,
  writer: Writer,
  deps: CaptureDeps,
  now: Date,
): Promise<CommunityTool> {
  const host = requireHost(input.url)
  const ownerSlugs = await requireOwnersExist(input.ownerSlugs)
  const slug = await freeSlug(input.name)

  const created = await getDbClient().dbCommunityTool.create({
    data: {
      slug,
      name: input.name,
      url: input.url,
      host,
      summary: input.summary,
      descriptionMd: input.descriptionMd,
      addedByUserId: writer.user.id,
      addedByName: writer.user.name,
      owners: { create: ownerSlugs.map((personSlug) => ({ personSlug })) },
      tags: { create: input.tags },
    },
  })
  await writeMarker(created.id, `New tool added: ${input.name}`, writer, null)
  captureLater(created, deps, now)

  return (await getTool(created.slug, writer.user, writer.isAdmin, now))!
}

export async function editTool(
  input: ToolInput & { slug: string },
  writer: Writer,
  deps: CaptureDeps,
  now: Date,
): Promise<CommunityTool> {
  const tool = await requireTool(input.slug)
  await requireEditor(tool, writer)
  const host = requireHost(input.url)
  const ownerSlugs = await requireOwnersExist(input.ownerSlugs)

  const sameSet = (a: string[], b: string[]) =>
    a.length === b.length && a.every((x) => b.includes(x))
  const tagKey = (t: { kind: string; value: string }) => `${t.kind}:${t.value}`
  const changed = [
    tool.name !== input.name && 'name',
    tool.url !== input.url && 'url',
    tool.summary !== input.summary && 'summary',
    tool.descriptionMd !== input.descriptionMd && 'description',
    !sameSet(
      tool.owners.map((o) => o.personSlug),
      ownerSlugs,
    ) && 'owners',
    !sameSet(tool.tags.map(tagKey), input.tags.map(tagKey)) && 'tags',
  ].filter((f): f is string => !!f)

  if (changed.length > 0) {
    const updated = await getDbClient().dbCommunityTool.update({
      where: { id: tool.id },
      data: {
        name: input.name,
        url: input.url,
        host,
        summary: input.summary,
        descriptionMd: input.descriptionMd,
        owners: {
          deleteMany: {},
          create: ownerSlugs.map((personSlug) => ({ personSlug })),
        },
        tags: { deleteMany: {}, create: input.tags },
      },
    })
    await writeMarker(
      tool.id,
      `Tool edited: ${changed.join(', ')}`,
      writer,
      null,
    )
    if (changed.includes('url')) captureLater(updated, deps, now)
  }

  // The slug stays: pins, links and bookmarks point at it.
  return (await getTool(tool.slug, writer.user, writer.isAdmin, now))!
}

export async function archiveTool(
  slug: string,
  reason: string,
  writer: Writer,
  now: Date,
): Promise<void> {
  const tool = await requireTool(slug)
  await requireEditor(tool, writer)

  await getDbClient().dbCommunityTool.update({
    where: { id: tool.id },
    data: {
      archivedAt: now,
      archivedBy: writer.user.name,
      archivedReason: reason,
    },
  })
  // An owner's archive is news to the maintainer; an admin's is their own decision.
  await writeMarker(
    tool.id,
    `Tool archived: ${reason}`,
    writer,
    writer.isAdmin ? 'acknowledged' : null,
  )
}

export async function approveTool(
  slug: string,
  writer: Writer,
  now: Date,
): Promise<void> {
  const tool = await requireTool(slug)
  const db = getDbClient()

  await db.dbCommunityTool.update({
    where: { id: tool.id },
    data: { reviewedAt: now, reviewedByName: writer.user.name },
  })
  await db.dbFeedback.updateMany({
    where: { communityToolId: tool.id, status: null },
    data: { status: 'applied', reviewedAt: now },
  })
  await writeMarker(tool.id, 'Tool approved', writer, 'applied')
}
