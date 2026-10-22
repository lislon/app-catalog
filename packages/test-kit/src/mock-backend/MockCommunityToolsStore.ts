import { TRPCError } from '@trpc/server'
import type {
  CommunityTag,
  CommunityTool,
} from '@igstack/app-catalog-shared-core'
import {
  hostOf,
  isCaptureAllowed,
  lifecycleOf,
  nextLifecycle,
} from '@igstack/app-catalog-shared-core'
import type { MockFeedbackStore } from '../mock-network/MockFeedbackStore'
import type { MockDb } from './MockDb'
import type { MockUserContext, SessionUser } from './MockUserContext'

/** The input of `communityTools.add`; `edit` adds the slug. */
export interface ToolInput {
  url: string
  name: string
  summary: string
  descriptionMd: string
  ownerSlugs: string[]
  tags: CommunityTag[]
}

export interface ToolPreview {
  host: string
  title: string | null
  screenshotDataUrl: string | null
  duplicate: { slug: string; name: string } | null
  captureAllowed: boolean
}

/** A tool row, the way the server's table holds it. */
interface StoredTool {
  id: string
  slug: string
  name: string
  url: string
  host: string
  summary: string
  descriptionMd: string
  ownerSlugs: string[]
  tags: CommunityTag[]
  addedBy: { userId: string; name: string }
  createdAt: Date
  reviewedAt: Date | null
  failingSince: Date | null
  archivedAt: Date | null
  archivedBy: string | null
  archivedReason: string | null
  screenshotId: string | null
  faviconId: string | null
  capturedAt: Date | null
}

/** Everything a scenario may preset on a tool; name and url are all it must give. */
export type ToolSeed = Partial<Omit<StoredTool, 'id' | 'host'>> & {
  name: string
  url: string
  views30d?: number
  viewsAll?: number
}

interface View {
  toolId: string
  actorHash: string
  userId: string | null
  day: Date
  at: Date
}

/** The clock every scenario runs on, so "N days" reads the same on any day. */
export const MOCK_NOW = new Date('2026-10-21T12:00:00Z')

const DAY_MS = 24 * 60 * 60 * 1000

/** The visitor cookie the real server would see from this browser. */
const VISITOR_HASH = 'mock-visitor'

const NO_SCHEME = 'The address must start with http:// or https://'

const PIXEL_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

function startOfDay(at: Date): Date {
  const day = new Date(at)
  day.setUTCHours(0, 0, 0, 0)
  return day
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'tool'
  )
}

/**
 * The `communityTools` router in memory: the same inputs, outputs and errors as
 * `router.ts`, `service.ts` and `writeService.ts` in backend-core, on the shared-core
 * rules the server uses. Writes leave the same review rows in the feedback store.
 */
export class MockCommunityToolsStore {
  private enabled = false
  private captureHosts: string[] = []
  /** What the headless browser would read off a page, by address. Anything else fails to load. */
  private pageTitles = new Map<string, string>()
  private tools: StoredTool[] = []
  private views: View[] = []
  private pinsByUser = new Map<string, string[]>()
  private counter = 0
  private tick = 0

  constructor(
    private readonly db: MockDb,
    private readonly userContext: MockUserContext,
    private readonly feedback: MockFeedbackStore,
  ) {}

  // -------------------------------------------------------------------------
  // Scenario setup
  // -------------------------------------------------------------------------

  enable(opts: { captureHosts: string[] }): void {
    this.enabled = true
    this.captureHosts = opts.captureHosts
  }

  /** A page the capture browser can open, and the title it finds there. */
  withPage(url: string, title: string): void {
    this.pageTitles.set(url, title)
  }

  pageTitled(title: string): string | undefined {
    return [...this.pageTitles].find(([, t]) => t === title)?.[0]
  }

  seed(seed: ToolSeed): string {
    const { views30d = 0, viewsAll = views30d, ...fields } = seed
    const host = hostOf(seed.url)
    if (!host) throw new Error(`Seeded tool "${seed.name}": ${NO_SCHEME}`)
    const tool = this.insert({ ...fields, host })
    const today = startOfDay(MOCK_NOW)
    for (let i = 0; i < viewsAll; i++) {
      // The first views30d inside the 30-day window, the rest before it.
      const daysAgo = i < views30d ? i % 30 : 30 + (i % 300)
      const day = new Date(today.getTime() - daysAgo * DAY_MS)
      this.views.push({
        toolId: tool.id,
        actorHash: `seed-${i}`,
        userId: null,
        day,
        at: day,
      })
    }
    return tool.slug
  }

  /** Runs the daily check against a dead page, once a day for `days` days up to now. */
  failDailyChecks(slug: string, days: number): void {
    const tool = this.stored(slug)
    for (let daysAgo = days; daysAgo >= 0; daysAgo--) {
      const at = new Date(MOCK_NOW.getTime() - daysAgo * DAY_MS)
      Object.assign(tool, nextLifecycle(tool, false, at))
    }
  }

  tagWithApp(slug: string, appSlug: string): void {
    this.stored(slug).tags.push({ kind: 'app', value: appSlug })
  }

  /** A pin the signed-in visitor made earlier. */
  seedPin(slug: string): void {
    const user = this.userContext.getSessionUser()
    if (!user)
      throw new Error('A pin belongs to a signed-in user; sign in first')
    this.pinTool(slug, user.id)
  }

  /** A tool published by someone else, still waiting for an admin. */
  seedUnreviewed(seed: ToolSeed): void {
    const existing = this.tools.find((t) => t.name === seed.name)
    if (existing) {
      existing.reviewedAt = null
      return
    }
    const slug = this.seed({ ...seed, reviewedAt: null })
    this.feedback.addReviewRow(
      slug,
      `New tool added: ${seed.name}`,
      seed.addedBy?.name ?? 'A colleague',
      null,
      false,
    )
  }

  slugOf(name: string): string {
    const tool = this.tools.find((t) => t.name === name)
    if (!tool) {
      throw new Error(
        `No community tool named "${name}". Available: ${this.tools.map((t) => t.name).join(', ')}`,
      )
    }
    return tool.slug
  }

  /** The stored row, for a verifier: the client never sees review or archive details. */
  inspect(name: string): Readonly<StoredTool> {
    return this.stored(this.slugOf(name))
  }

  // -------------------------------------------------------------------------
  // Procedures
  // -------------------------------------------------------------------------

  config(): { enabled: boolean } {
    return { enabled: this.enabled }
  }

  list(): CommunityTool[] {
    this.requireEnabled()
    const user = this.userContext.getSessionUser()
    return this.tools.map((tool) => this.toView(tool, user))
  }

  get(input: { slug: string }): CommunityTool {
    this.requireEnabled()
    const tool = this.tools.find((t) => t.slug === input.slug)
    if (!tool) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Tool not found' })
    }
    return this.toView(tool, this.userContext.getSessionUser())
  }

  recordView(input: { slug: string }): { views30d: number; viewsAll: number } {
    this.requireEnabled()
    const tool = this.tools.find((t) => t.slug === input.slug)
    if (!tool) throw new Error('Tool not found')
    const userId = this.userContext.getSessionUser()?.id ?? null
    const day = startOfDay(MOCK_NOW)
    // Distinct instants, so "most recent" has an order inside the frozen clock.
    const at = new Date(MOCK_NOW.getTime() + ++this.tick)
    const same = this.views.find(
      (v) =>
        v.toolId === tool.id &&
        v.actorHash === VISITOR_HASH &&
        v.day.getTime() === day.getTime(),
    )
    if (same) {
      same.at = at
      same.userId = userId
    } else {
      this.views.push({
        toolId: tool.id,
        actorHash: VISITOR_HASH,
        userId,
        day,
        at,
      })
    }
    return this.viewCounts(tool)
  }

  recent(): CommunityTool[] {
    const user = this.requireUser()
    const ids: string[] = []
    for (const view of [...this.views]
      .filter((v) => v.userId === user.id)
      .sort((a, b) => b.at.getTime() - a.at.getTime())) {
      if (!ids.includes(view.toolId)) ids.push(view.toolId)
      if (ids.length === 5) break
    }
    return ids.map((id) =>
      this.toView(this.tools.find((t) => t.id === id)!, user),
    )
  }

  pins(): CommunityTool[] {
    const user = this.requireUser()
    return (this.pinsByUser.get(user.id) ?? []).map((slug) =>
      this.toView(this.stored(slug), user),
    )
  }

  pin(input: { slug: string }): void {
    this.pinTool(input.slug, this.requireUser().id)
  }

  unpin(input: { slug: string }): void {
    const user = this.requireUser()
    if (!this.tools.some((t) => t.slug === input.slug)) {
      throw new Error('Tool not found')
    }
    this.pinsByUser.set(
      user.id,
      (this.pinsByUser.get(user.id) ?? []).filter((s) => s !== input.slug),
    )
  }

  /** Named pins first in the given order, then the rest as they were. */
  reorderPins(input: { slugs: string[] }): void {
    const user = this.requireUser()
    const pinned = this.pinsByUser.get(user.id) ?? []
    const named = input.slugs.filter((s) => pinned.includes(s))
    this.pinsByUser.set(user.id, [
      ...new Set([...named, ...pinned.filter((s) => !named.includes(s))]),
    ])
  }

  preview(input: { url: string }): ToolPreview {
    this.requireUser()
    const host = this.requireHost(input.url)
    const captureAllowed = isCaptureAllowed(input.url, this.captureHosts)
    const duplicate = this.tools.find((t) => t.host === host)
    const title = captureAllowed
      ? (this.pageTitles.get(input.url) ?? null)
      : null
    return {
      host,
      title,
      screenshotDataUrl: title === null ? null : PIXEL_DATA_URL,
      duplicate: duplicate
        ? { slug: duplicate.slug, name: duplicate.name }
        : null,
      captureAllowed,
    }
  }

  add(input: ToolInput): CommunityTool {
    const user = this.requireUser()
    const host = this.requireHost(input.url)
    const ownerSlugs = this.requireOwnersExist(input.ownerSlugs)
    const tool = this.insert({
      name: input.name.trim(),
      url: input.url,
      host,
      summary: input.summary.trim(),
      descriptionMd: input.descriptionMd,
      ownerSlugs,
      tags: input.tags,
      addedBy: { userId: user.id, name: user.name },
      reviewedAt: null,
    })
    this.feedback.addReviewRow(
      tool.slug,
      `New tool added: ${tool.name}`,
      user.name,
      null,
    )
    return this.toView(tool, user)
  }

  edit(input: ToolInput & { slug: string }): CommunityTool {
    const user = this.requireUser()
    const tool = this.requireTool(input.slug)
    this.requireEditor(tool, user)
    const host = this.requireHost(input.url)
    const ownerSlugs = this.requireOwnersExist(input.ownerSlugs)
    const name = input.name.trim()
    const summary = input.summary.trim()

    const sameSet = (a: string[], b: string[]) =>
      a.length === b.length && a.every((x) => b.includes(x))
    const tagKey = (t: CommunityTag) => `${t.kind}:${t.value}`
    const changed = [
      tool.name !== name && 'name',
      tool.url !== input.url && 'url',
      tool.summary !== summary && 'summary',
      tool.descriptionMd !== input.descriptionMd && 'description',
      !sameSet(tool.ownerSlugs, ownerSlugs) && 'owners',
      !sameSet(tool.tags.map(tagKey), input.tags.map(tagKey)) && 'tags',
    ].filter((f): f is string => !!f)

    if (changed.length > 0) {
      Object.assign(tool, {
        name,
        url: input.url,
        host,
        summary,
        descriptionMd: input.descriptionMd,
        ownerSlugs,
        tags: input.tags,
      })
      this.feedback.addReviewRow(
        tool.slug,
        `Tool edited: ${changed.join(', ')}`,
        user.name,
        null,
      )
    }
    return this.toView(tool, user)
  }

  archive(input: { slug: string; reason: string }): void {
    const user = this.requireUser()
    const tool = this.requireTool(input.slug)
    this.requireEditor(tool, user)
    const reason = input.reason.trim()
    tool.archivedAt = MOCK_NOW
    tool.archivedBy = user.name
    tool.archivedReason = reason
    // An owner's archive is news to the maintainer; an admin's is their own decision.
    this.feedback.addReviewRow(
      tool.slug,
      `Tool archived: ${reason}`,
      user.name,
      user.isAdmin ? 'acknowledged' : null,
    )
  }

  /** `adminProcedure`: sign-in, then admin, then the feature switch. */
  approve(input: { slug: string }): void {
    const user = this.requireSignedIn()
    if (!user.isAdmin) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Admin access required',
      })
    }
    this.requireEnabled()
    const tool = this.requireTool(input.slug)
    tool.reviewedAt = MOCK_NOW
    this.feedback.applyPending(tool.slug, MOCK_NOW)
    this.feedback.addReviewRow(tool.slug, 'Tool approved', user.name, 'applied')
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private insert(
    fields: Omit<ToolSeed, 'views30d' | 'viewsAll'> & { host: string },
  ): StoredTool {
    this.counter += 1
    const tool: StoredTool = {
      summary: '',
      descriptionMd: '',
      ownerSlugs: [],
      tags: [],
      addedBy: { userId: 'seed-user-id', name: 'A colleague' },
      createdAt: MOCK_NOW,
      reviewedAt: MOCK_NOW,
      failingSince: null,
      archivedAt: null,
      archivedBy: null,
      archivedReason: null,
      screenshotId: null,
      faviconId: null,
      capturedAt: null,
      ...fields,
      id: `tool-${this.counter}`,
      slug: fields.slug ?? this.freeSlug(fields.name),
    }
    this.tools.push(tool)
    return tool
  }

  private freeSlug(name: string): string {
    const base = slugify(name)
    for (let n = 1; ; n++) {
      const slug = n === 1 ? base : `${base}-${n}`
      if (!this.tools.some((t) => t.slug === slug)) return slug
    }
  }

  private pinTool(slug: string, userId: string): void {
    if (!this.tools.some((t) => t.slug === slug)) {
      throw new Error('Tool not found')
    }
    const pinned = this.pinsByUser.get(userId) ?? []
    // The server's (userId, toolId) key refuses a second pin with a database error.
    if (pinned.includes(slug)) throw new Error('Unique constraint failed')
    this.pinsByUser.set(userId, [...pinned, slug])
  }

  private stored(slug: string): StoredTool {
    const tool = this.tools.find((t) => t.slug === slug)
    if (!tool) throw new Error(`No community tool with slug "${slug}"`)
    return tool
  }

  private requireEnabled(): void {
    if (!this.enabled) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Community tools are disabled',
      })
    }
  }

  private requireSignedIn(): SessionUser {
    const user = this.userContext.getSessionUser()
    if (!user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to access this resource',
      })
    }
    return user
  }

  /** `protectedProcedure`: sign-in first, then the feature switch. */
  private requireUser(): SessionUser {
    const user = this.requireSignedIn()
    this.requireEnabled()
    return user
  }

  private requireTool(slug: string): StoredTool {
    const tool = this.tools.find((t) => t.slug === slug)
    if (!tool) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Tool not found' })
    }
    return tool
  }

  private requireHost(url: string): string {
    const host = hostOf(url)
    if (!host) throw new TRPCError({ code: 'BAD_REQUEST', message: NO_SCHEME })
    return host
  }

  private requireOwnersExist(ownerSlugs: string[]): string[] {
    const unique = [...new Set(ownerSlugs)]
    if (!unique.every((slug) => this.db.persons.some((p) => p.slug === slug))) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Every owner must be in the person directory',
      })
    }
    return unique
  }

  private requireEditor(tool: StoredTool, user: SessionUser): void {
    if (!this.canEdit(tool, user)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only an owner or an admin can change this tool',
      })
    }
  }

  private canEdit(tool: StoredTool, user: SessionUser | null): boolean {
    if (!user) return false
    return (
      user.isAdmin ||
      tool.addedBy.userId === user.id ||
      tool.ownerSlugs.includes(user.email)
    )
  }

  private viewCounts(tool: StoredTool): { views30d: number; viewsAll: number } {
    const since = new Date(startOfDay(MOCK_NOW).getTime() - 29 * DAY_MS)
    const mine = this.views.filter((v) => v.toolId === tool.id)
    return {
      views30d: mine.filter((v) => v.day >= since).length,
      viewsAll: mine.length,
    }
  }

  private toView(tool: StoredTool, user: SessionUser | null): CommunityTool {
    return {
      slug: tool.slug,
      name: tool.name,
      url: tool.url,
      host: tool.host,
      summary: tool.summary,
      descriptionMd: tool.descriptionMd,
      owners: tool.ownerSlugs.map((slug) => {
        const person = this.db.persons.find((p) => p.slug === slug)
        const name = person
          ? `${person.firstName} ${person.lastName}`.trim()
          : ''
        return { slug, name: name || slug }
      }),
      addedBy: tool.addedBy,
      createdAt: tool.createdAt.toISOString(),
      tags: tool.tags,
      ...this.viewCounts(tool),
      reviewed: tool.reviewedAt !== null,
      lifecycle: lifecycleOf(tool, MOCK_NOW),
      screenshotId: tool.screenshotId,
      faviconId: tool.faviconId,
      capturedAt: tool.capturedAt?.toISOString() ?? null,
      canEdit: this.canEdit(tool, user),
    }
  }
}
