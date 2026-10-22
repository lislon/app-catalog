import { TRPCError } from '@trpc/server'
import type { ToolPreview } from '@igstack/app-catalog-backend-core'
import type {
  CommunityTag,
  CommunityTool,
} from '@igstack/app-catalog-shared-core'
import {
  TAG_VALUE_MAX,
  hostOf,
  isCaptureAllowed,
  lifecycleOf,
  nextLifecycle,
  normalizeTags,
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
  /** Owners outside the person directory, by name. */
  ownerNames?: string[]
  tags: CommunityTag[]
}

export type { ToolPreview }

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
  ownerNames: string[]
  tags: CommunityTag[]
  addedBy: { userId: string; name: string }
  createdAt: Date
  reviewedAt: Date | null
  /** The last daily visit, failed or not; null until the first one ran. */
  lastCheckAt: Date | null
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
  day: Date
}

/** The clock every scenario runs on, so "N days" reads the same on any day. */
export const MOCK_NOW = new Date('2026-10-21T12:00:00Z')

const DAY_MS = 24 * 60 * 60 * 1000

/** The server's bound on captures waiting behind the running one. */
const MAX_WAITING_CAPTURES = 3

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
  /** How long reading a page takes, by address; unlisted pages answer at once. */
  private pageDelays = new Map<string, number>()
  /** Addresses whose preview was asked for, and answered, in order. */
  readonly previewsAsked: string[] = []
  readonly previewsAnswered: string[] = []
  /** How many times the app counts were answered: a "no link" check waits for one. */
  countsAnswered = 0
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

  /** The deployment has not turned the feature on: only `config` answers. */
  disable(): void {
    this.enabled = false
  }

  /** A page the capture browser can open, and the title it finds there. */
  withPage(url: string, title: string, delayMs = 0): void {
    this.pageTitles.set(url, title)
    if (delayMs) this.pageDelays.set(url, delayMs)
  }

  /** The title the capture browser finds at this address, if it can open it. */
  pageTitle(url: string): string | undefined {
    return this.pageTitles.get(url)
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
        day,
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
      tool.lastCheckAt = at
    }
  }

  /** An owner or a maintainer archived the tool. */
  archiveAs(slug: string, name: string): void {
    const tool = this.stored(slug)
    tool.archivedAt = MOCK_NOW
    tool.archivedBy = name
  }

  /** The first visit of a tool waiting for one lands, with a screenshot. */
  finishCapture(slug: string): void {
    const tool = this.stored(slug)
    tool.lastCheckAt = MOCK_NOW
    tool.screenshotId = `${slug}-shot`
    tool.capturedAt = MOCK_NOW
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

  /** How many tools wait in the maintainer's review list. */
  awaitingReview(): number {
    return this.feedback.pendingToolSlugs().length
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

  countByApp(): Record<string, number> {
    this.requireEnabled()
    const counts: Record<string, number> = {}
    for (const tool of this.tools) {
      if (tool.archivedAt) continue
      for (const tag of tool.tags) {
        if (tag.kind === 'app') counts[tag.value] = (counts[tag.value] ?? 0) + 1
      }
    }
    this.countsAnswered += 1
    return counts
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
    const day = startOfDay(MOCK_NOW)
    // One view per visitor per day, as on the server.
    const same = this.views.some(
      (v) =>
        v.toolId === tool.id &&
        v.actorHash === VISITOR_HASH &&
        v.day.getTime() === day.getTime(),
    )
    if (!same) {
      this.views.push({ toolId: tool.id, actorHash: VISITOR_HASH, day })
    }
    return this.viewCounts(tool)
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
    this.requireTool(input.slug)
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
    const officialApp = this.db.resources.find(
      (r) => !r.parentSlug && r.appUrl && hostOf(r.appUrl) === host,
    )
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
      officialApp: officialApp
        ? { slug: officialApp.slug, name: officialApp.displayName }
        : null,
      captureAllowed,
    }
  }

  /** `preview` as the network answers it: after the page's reading time. */
  async previewWhenRead(input: { url: string }): Promise<ToolPreview> {
    // The server queues captures one at a time and refuses a preview past three
    // waiting; here every unanswered preview but one stands for a waiting capture.
    const waiting = this.previewsAsked.length - this.previewsAnswered.length - 1
    if (
      isCaptureAllowed(input.url, this.captureHosts) &&
      waiting >= MAX_WAITING_CAPTURES
    ) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many previews in progress; try again in a minute',
      })
    }
    this.previewsAsked.push(input.url)
    const ms = this.pageDelays.get(input.url) ?? 0
    if (ms) await new Promise((resolve) => setTimeout(resolve, ms))
    try {
      return this.preview(input)
    } finally {
      this.previewsAnswered.push(input.url)
    }
  }

  add(input: ToolInput): CommunityTool {
    const user = this.requireUser()
    const host = this.requireHost(input.url)
    const { ownerSlugs, ownerNames } = this.requireOwners(input)
    const tags = this.requireTags(input.tags)
    const tool = this.insert({
      name: input.name.trim(),
      url: input.url,
      host,
      summary: input.summary.trim(),
      descriptionMd: input.descriptionMd,
      ownerSlugs,
      ownerNames,
      tags,
      addedBy: { userId: user.id, name: user.name },
      // After every seeded tool, so Newest has an order inside the frozen clock.
      createdAt: new Date(MOCK_NOW.getTime() + ++this.tick),
      reviewedAt: null,
      lastCheckAt: null,
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
    const { ownerSlugs, ownerNames } = this.requireOwners(input)
    const tags = this.requireTags(input.tags)
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
      !(
        sameSet(tool.ownerSlugs, ownerSlugs) &&
        sameSet(tool.ownerNames, ownerNames)
      ) && 'owners',
      !sameSet(tool.tags.map(tagKey), tags.map(tagKey)) && 'tags',
    ].filter((f): f is string => !!f)

    if (changed.length > 0) {
      if (host !== tool.host) {
        // A different site starts its health over, and is checked afresh.
        tool.failingSince = null
        tool.lastCheckAt = null
        if (tool.archivedBy === 'auto') {
          tool.archivedAt = null
          tool.archivedBy = null
          tool.archivedReason = null
        }
      }
      Object.assign(tool, {
        // An edit waits for an admin's approval again.
        reviewedAt: null,
        name,
        url: input.url,
        host,
        summary,
        descriptionMd: input.descriptionMd,
        ownerSlugs,
        ownerNames,
        tags,
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
      ownerNames: [],
      tags: [],
      addedBy: { userId: 'seed-user-id', name: 'A colleague' },
      createdAt: MOCK_NOW,
      reviewedAt: MOCK_NOW,
      // A seeded tool has been around: its first visit is behind it.
      lastCheckAt: MOCK_NOW,
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

  /** Pinning a pinned tool leaves it where it is. */
  private pinTool(slug: string, userId: string): void {
    this.requireTool(slug)
    const pinned = this.pinsByUser.get(userId) ?? []
    if (!pinned.includes(slug)) this.pinsByUser.set(userId, [...pinned, slug])
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

  /** The server's owner rules: 1 to 5 of either kind, people that exist. */
  private requireOwners(input: ToolInput): {
    ownerSlugs: string[]
    ownerNames: string[]
  } {
    const unique = [...new Set(input.ownerSlugs)]
    const ownerNames = [
      ...new Set((input.ownerNames ?? []).map((n) => n.trim()).filter(Boolean)),
    ]
    const count = unique.length + ownerNames.length
    if (count < 1 || count > 5) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'A tool has 1 to 5 owners',
      })
    }
    if (!unique.every((slug) => this.db.persons.some((p) => p.slug === slug))) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Every owner must be in the person directory',
      })
    }
    return { ownerSlugs: unique, ownerNames }
  }

  /** The input schema's tag rules, which the msw layer does not run. */
  private requireTags(input: CommunityTag[]): CommunityTag[] {
    const tags = normalizeTags(input)
    if (
      tags.length > 8 ||
      tags.some((t) => !t.value || t.value.length > TAG_VALUE_MAX)
    ) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `At most 8 tags, each at most ${TAG_VALUE_MAX} characters`,
      })
    }
    return tags
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
      owners: [
        ...tool.ownerSlugs.map((slug) => {
          const person = this.db.persons.find((p) => p.slug === slug)
          const name = person
            ? `${person.firstName} ${person.lastName}`.trim()
            : ''
          return { slug, name: name || slug }
        }),
        // Outside the directory: a name to ask for, never an editor.
        ...tool.ownerNames.map((name) => ({ slug: null, name })),
      ],
      addedBy: tool.addedBy,
      createdAt: tool.createdAt.toISOString(),
      tags: tool.tags,
      ...this.viewCounts(tool),
      reviewed: tool.reviewedAt !== null,
      lifecycle: lifecycleOf(tool, MOCK_NOW),
      screenshotId: tool.screenshotId,
      faviconId: tool.faviconId,
      capturedAt: tool.capturedAt?.toISOString() ?? null,
      // The mock always has a capturer: the host list alone decides.
      capturePending:
        !tool.screenshotId &&
        !tool.lastCheckAt &&
        isCaptureAllowed(tool.url, this.captureHosts),
      canEdit: this.canEdit(tool, user),
    }
  }
}
