import type {
  CommunityTag,
  CommunityTool,
  PersonRef,
} from '@igstack/app-catalog-shared-core'
import {
  hostOf,
  isCaptureAllowed,
  lifecycleOf,
} from '@igstack/app-catalog-shared-core'
import type { MockUserContext } from './MockUserContext'

interface DbTool {
  id: string
  slug: string
  name: string
  url: string
  host: string
  summary: string
  descriptionMd: string
  ownerSlugs: string[]
  addedByUserId: string
  addedByName: string
  createdAt: Date
  tags: CommunityTag[]
  reviewedAt: Date | null
  reviewedByName: string | null
  failingSince: Date | null
  archivedAt: Date | null
  archivedBy: string | null
  archivedReason: string | null
  screenshotAssetId: string | null
  faviconAssetId: string | null
  capturedAt: Date | null
}

interface DbView {
  toolId: string
  actorHash: string
  userId: string | null
  day: Date
  at: Date
}

interface DbPin {
  userId: string
  toolId: string
  position: number
}

interface DbPerson {
  slug: string
  firstName: string
  lastName: string
}

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

export class MockCommunityToolsStore {
  private tools: DbTool[] = []
  private views: DbView[] = []
  private pinsData: DbPin[] = []
  private persons: DbPerson[] = []
  private counter = 0
  private now = new Date('2026-10-21T12:00:00Z')
  private captureHosts: string[] = []

  constructor(
    private userContext: MockUserContext,
    captureHosts?: string[],
  ) {
    this.captureHosts = captureHosts ?? []
  }

  withPerson(slug: string, firstName: string, lastName: string): void {
    this.persons.push({ slug, firstName, lastName })
  }

  withTool(input: {
    slug: string
    name: string
    url: string
    summary: string
    descriptionMd: string
    ownerSlugs: string[]
    tags: CommunityTag[]
    addedByUserId?: string
    addedByName?: string
    createdAt?: Date
    views30d?: number
    viewsAll?: number
    reviewedAt?: Date | null
    failingSince?: Date | null
    archivedAt?: Date | null
    archivedBy?: string | null
  }): void {
    this.counter += 1
    const toolId = `tool-${this.counter}`

    const tool: DbTool = {
      id: toolId,
      slug: input.slug,
      name: input.name,
      url: input.url,
      host: hostOf(input.url) ?? input.url,
      summary: input.summary,
      descriptionMd: input.descriptionMd,
      ownerSlugs: input.ownerSlugs,
      addedByUserId: input.addedByUserId ?? 'system',
      addedByName: input.addedByName ?? 'System',
      createdAt: input.createdAt ?? this.now,
      tags: input.tags,
      reviewedAt: input.reviewedAt ?? null,
      reviewedByName: null,
      failingSince: input.failingSince ?? null,
      archivedAt: input.archivedAt ?? null,
      archivedBy: input.archivedBy ?? null,
      archivedReason: null,
      screenshotAssetId: null,
      faviconAssetId: null,
      capturedAt: null,
    }

    this.tools.push(tool)

    // Seed views if provided
    if (input.viewsAll) {
      for (let i = 0; i < input.viewsAll; i++) {
        const dayOffset =
          input.views30d && i < input.views30d
            ? Math.floor(Math.random() * 29)
            : Math.floor(Math.random() * 365)
        const day = new Date(this.now)
        day.setUTCDate(day.getUTCDate() - dayOffset)
        day.setUTCHours(0, 0, 0, 0)

        this.views.push({
          toolId,
          actorHash: `actor-${i}`,
          userId: null,
          day,
          at: new Date(day.getTime() + Math.random() * 86400000),
        })
      }
    }
  }

  setFailingSince(slug: string, days: number): void {
    const tool = this.tools.find((t) => t.slug === slug)
    if (tool) {
      const failDate = new Date(this.now)
      failDate.setUTCDate(failDate.getUTCDate() - days)
      tool.failingSince = failDate
    }
  }

  setPinned(slug: string, userId: string): void {
    const tool = this.tools.find((t) => t.slug === slug)
    if (!tool) return

    const maxPin = this.pinsData
      .filter((p) => p.userId === userId)
      .reduce((max, p) => Math.max(max, p.position), -1)

    this.pinsData.push({
      userId,
      toolId: tool.id,
      position: maxPin + 1,
    })
  }

  private requireAuth(): { userId: string; name: string; isAdmin: boolean } {
    const user = this.userContext.getUser()
    if (!user.isAuthenticated) {
      throw new Error('UNAUTHORIZED')
    }
    return {
      userId: 'test-user-id',
      name: user.name,
      isAdmin: user.isAdmin,
    }
  }

  private requireAdmin(): { userId: string; name: string; isAdmin: true } {
    const auth = this.requireAuth()
    if (!auth.isAdmin) {
      throw new Error('FORBIDDEN')
    }
    return { ...auth, isAdmin: true as const }
  }

  private computeCanEdit(
    tool: DbTool,
    userId: string,
    isAdmin: boolean,
  ): boolean {
    if (isAdmin) return true
    if (tool.addedByUserId === userId) return true

    const session = this.userContext.getSessionResponse()
    if (!session) return false

    const userEmail = (session as any).user.email
    return tool.ownerSlugs.some((slug) => slug === userEmail)
  }

  private toView(
    tool: DbTool,
    userId: string | null,
    isAdmin: boolean,
  ): CommunityTool {
    const owners: PersonRef[] = tool.ownerSlugs.map((slug) => {
      const person = this.persons.find((p) => p.slug === slug)
      if (person) {
        const name = `${person.firstName} ${person.lastName}`.trim()
        return { slug, name: name || slug }
      }
      return { slug, name: slug }
    })

    const today = new Date(this.now)
    today.setUTCHours(0, 0, 0, 0)
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29)

    const views30d = this.views.filter(
      (v) => v.toolId === tool.id && v.day >= thirtyDaysAgo,
    ).length
    const viewsAll = this.views.filter((v) => v.toolId === tool.id).length

    const lifecycle = lifecycleOf(
      {
        failingSince: tool.failingSince,
        archivedAt: tool.archivedAt,
        archivedBy: tool.archivedBy,
        archivedReason: tool.archivedReason,
      },
      this.now,
    )

    const canEdit = userId ? this.computeCanEdit(tool, userId, isAdmin) : false

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
      tags: tool.tags,
      views30d,
      viewsAll,
      reviewed: tool.reviewedAt !== null,
      lifecycle,
      screenshotId: tool.screenshotAssetId,
      faviconId: tool.faviconAssetId,
      capturedAt: tool.capturedAt?.toISOString() ?? null,
      canEdit,
    }
  }

  config(): { enabled: boolean } {
    return { enabled: true }
  }

  list(): CommunityTool[] {
    const user = this.userContext.getUser()
    const userId = user.isAuthenticated ? 'test-user-id' : null
    return this.tools.map((tool) => this.toView(tool, userId, user.isAdmin))
  }

  get(slug: string): CommunityTool | null {
    const tool = this.tools.find((t) => t.slug === slug)
    if (!tool) return null

    const user = this.userContext.getUser()
    const userId = user.isAuthenticated ? 'test-user-id' : null
    return this.toView(tool, userId, user.isAdmin)
  }

  recordView(slug: string): { views30d: number; viewsAll: number } {
    const tool = this.tools.find((t) => t.slug === slug)
    if (!tool) throw new Error('Tool not found')

    const day = new Date(this.now)
    day.setUTCHours(0, 0, 0, 0)

    const user = this.userContext.getUser()
    const userId = user.isAuthenticated ? 'test-user-id' : null
    const actorHash = 'test-actor-hash'

    // Upsert: remove existing view for this actor+day, then add new
    this.views = this.views.filter(
      (v) =>
        !(
          v.toolId === tool.id &&
          v.actorHash === actorHash &&
          v.day.getTime() === day.getTime()
        ),
    )

    this.views.push({
      toolId: tool.id,
      actorHash,
      userId,
      day,
      at: this.now,
    })

    const thirtyDaysAgo = new Date(day)
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29)

    const views30d = this.views.filter(
      (v) => v.toolId === tool.id && v.day >= thirtyDaysAgo,
    ).length
    const viewsAll = this.views.filter((v) => v.toolId === tool.id).length

    return { views30d, viewsAll }
  }

  recent(): CommunityTool[] {
    const auth = this.requireAuth()

    const recentViews = this.views
      .filter((v) => v.userId === auth.userId)
      .sort((a, b) => b.at.getTime() - a.at.getTime())

    const seen = new Set<string>()
    const toolIds: string[] = []
    for (const view of recentViews) {
      if (!seen.has(view.toolId)) {
        seen.add(view.toolId)
        toolIds.push(view.toolId)
        if (toolIds.length === 5) break
      }
    }

    return toolIds
      .map((id) => this.tools.find((t) => t.id === id))
      .filter((t): t is DbTool => t !== undefined)
      .map((tool) => this.toView(tool, auth.userId, auth.isAdmin))
  }

  pins(): CommunityTool[] {
    const auth = this.requireAuth()

    const userPins = this.pinsData
      .filter((p) => p.userId === auth.userId)
      .sort((a, b) => a.position - b.position)

    return userPins
      .map((pin) => this.tools.find((t) => t.id === pin.toolId))
      .filter((t): t is DbTool => t !== undefined)
      .map((tool) => this.toView(tool, auth.userId, auth.isAdmin))
  }

  pin(slug: string): void {
    const auth = this.requireAuth()
    const tool = this.tools.find((t) => t.slug === slug)
    if (!tool) throw new Error('Tool not found')

    const maxPin = this.pinsData
      .filter((p) => p.userId === auth.userId)
      .reduce((max, p) => Math.max(max, p.position), -1)

    this.pinsData.push({
      userId: auth.userId,
      toolId: tool.id,
      position: maxPin + 1,
    })
  }

  unpin(slug: string): void {
    const auth = this.requireAuth()
    const tool = this.tools.find((t) => t.slug === slug)
    if (!tool) throw new Error('Tool not found')

    this.pinsData = this.pinsData.filter(
      (p) => !(p.userId === auth.userId && p.toolId === tool.id),
    )
  }

  reorderPins(slugs: string[]): void {
    const auth = this.requireAuth()

    const userPins = this.pinsData.filter((p) => p.userId === auth.userId)
    const slugToPin = new Map(
      userPins
        .map((p) => {
          const tool = this.tools.find((t) => t.id === p.toolId)
          return [tool?.slug, p]
        })
        .filter(([slug]) => slug !== undefined) as [string, DbPin][],
    )

    const namedPins = slugs
      .map((slug) => slugToPin.get(slug))
      .filter((p): p is DbPin => p !== undefined)
    const unlistedPins = userPins.filter((p) => {
      const tool = this.tools.find((t) => t.id === p.toolId)
      return !tool || !slugs.includes(tool.slug)
    })

    const newOrder = [...namedPins, ...unlistedPins]
    newOrder.forEach((pin, index) => {
      pin.position = index
    })
  }

  preview(url: string): ToolPreview {
    this.requireAuth()

    const host = hostOf(url)
    if (!host) {
      throw new Error(
        'BAD_REQUEST: The address must start with http:// or https://',
      )
    }

    const captureAllowed = isCaptureAllowed(url, this.captureHosts)

    const duplicate =
      this.tools
        .filter((t) => t.host === host)
        .map((t) => ({ slug: t.slug, name: t.name }))[0] ?? null

    // Fixture stub for QC Heatmap
    if (url === 'https://qc-heatmap-9f8e.pages.example.com/') {
      return {
        host,
        title: 'QC Heatmap',
        screenshotDataUrl: null,
        duplicate,
        captureAllowed,
      }
    }

    return {
      host,
      title: null,
      screenshotDataUrl: null,
      duplicate,
      captureAllowed,
    }
  }

  add(input: ToolInput): CommunityTool {
    const auth = this.requireAuth()

    const host = hostOf(input.url)
    if (!host) {
      throw new Error(
        'BAD_REQUEST: The address must start with http:// or https://',
      )
    }

    // Check owners exist
    for (const ownerSlug of input.ownerSlugs) {
      if (!this.persons.find((p) => p.slug === ownerSlug)) {
        throw new Error(
          'BAD_REQUEST: Every owner must be in the person directory',
        )
      }
    }

    this.counter += 1
    const slug = this.slugify(input.name)

    const tool: DbTool = {
      id: `tool-${this.counter}`,
      slug,
      name: input.name,
      url: input.url,
      host,
      summary: input.summary,
      descriptionMd: input.descriptionMd,
      ownerSlugs: input.ownerSlugs,
      addedByUserId: auth.userId,
      addedByName: auth.name,
      createdAt: this.now,
      tags: input.tags,
      reviewedAt: null,
      reviewedByName: null,
      failingSince: null,
      archivedAt: null,
      archivedBy: null,
      archivedReason: null,
      screenshotAssetId: null,
      faviconAssetId: null,
      capturedAt: null,
    }

    this.tools.push(tool)
    return this.toView(tool, auth.userId, auth.isAdmin)
  }

  edit(input: ToolInput & { slug: string }): CommunityTool {
    const auth = this.requireAuth()
    const tool = this.tools.find((t) => t.slug === input.slug)
    if (!tool) throw new Error('NOT_FOUND: Tool not found')

    if (!this.computeCanEdit(tool, auth.userId, auth.isAdmin)) {
      throw new Error(
        'FORBIDDEN: Only an owner or an admin can change this tool',
      )
    }

    const host = hostOf(input.url)
    if (!host) {
      throw new Error(
        'BAD_REQUEST: The address must start with http:// or https://',
      )
    }

    for (const ownerSlug of input.ownerSlugs) {
      if (!this.persons.find((p) => p.slug === ownerSlug)) {
        throw new Error(
          'BAD_REQUEST: Every owner must be in the person directory',
        )
      }
    }

    tool.name = input.name
    tool.url = input.url
    tool.host = host
    tool.summary = input.summary
    tool.descriptionMd = input.descriptionMd
    tool.ownerSlugs = input.ownerSlugs
    tool.tags = input.tags

    return this.toView(tool, auth.userId, auth.isAdmin)
  }

  archive(slug: string, reason: string): void {
    const auth = this.requireAuth()
    const tool = this.tools.find((t) => t.slug === slug)
    if (!tool) throw new Error('NOT_FOUND: Tool not found')

    if (!this.computeCanEdit(tool, auth.userId, auth.isAdmin)) {
      throw new Error(
        'FORBIDDEN: Only an owner or an admin can change this tool',
      )
    }

    tool.archivedAt = this.now
    tool.archivedBy = auth.name
    tool.archivedReason = reason
  }

  approve(slug: string): void {
    const auth = this.requireAdmin()
    const tool = this.tools.find((t) => t.slug === slug)
    if (!tool) throw new Error('NOT_FOUND: Tool not found')

    tool.reviewedAt = this.now
    tool.reviewedByName = auth.name
  }

  private slugify(name: string): string {
    const base =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'tool'

    for (let n = 1; ; n++) {
      const slug = n === 1 ? base : `${base}-${n}`
      if (!this.tools.find((t) => t.slug === slug)) return slug
    }
  }
}
