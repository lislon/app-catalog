/**
 * In-memory feedback, so a scenario can post a correction and then read it back.
 *
 * The earlier mock answered `list` with a constant empty page, which meant no test
 * could cover the thing the feature exists for: someone reports a problem and sees
 * their own report land. A scenario that cannot observe its own write proves only
 * that the button does not throw.
 */
import { TRPCError } from '@trpc/server'

/** One item as the client sees it — the server's `FeedbackView`, which it must match. */
export interface MockFeedbackItem {
  id: string
  authorName: string
  body: string | null
  subject: string | null
  resourceSlug: string | null
  resourceName: string | null
  attachmentIds: string[]
  status: 'applied' | 'acknowledged' | null
  reviewerReply: string | null
  reviewedAt: string | null
  createdAt: string
  editedAt: string | null
  isMine: boolean
  isSystem: boolean
  canEditUntil: string | null
}

export interface MockAddFeedbackInput {
  resourceSlug?: string
  communityToolSlug?: string
  subject?: string
  body?: string
  attachmentIds?: string[]
}

/** The pseudonym the real server would mint from the visitor cookie. */
const MOCK_ALIAS = 'Curious Ferret'

/** A view keyed by the community tool it is about, which the view itself does not carry. */
type StoredItem = MockFeedbackItem & { communityToolSlug: string | null }

function toItem({
  communityToolSlug: _,
  ...item
}: StoredItem): MockFeedbackItem {
  return item
}

export class MockFeedbackStore {
  private items: StoredItem[] = []
  private counter = 0

  /** Pre-existing feedback, for a scenario that starts with a thread already there. */
  seed(items: Partial<MockFeedbackItem>[]): void {
    for (const item of items) this.push(item)
  }

  private push(item: Partial<StoredItem>): MockFeedbackItem {
    this.counter += 1
    const now = new Date().toISOString()
    const full: StoredItem = {
      id: `fb-${this.counter}`,
      communityToolSlug: null,
      authorName: MOCK_ALIAS,
      body: null,
      subject: null,
      resourceSlug: null,
      resourceName: null,
      attachmentIds: [],
      status: null,
      reviewerReply: null,
      reviewedAt: null,
      createdAt: now,
      editedAt: null,
      isMine: true,
      isSystem: false,
      canEditUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      ...item,
    }
    this.items.push(full)
    return toItem(full)
  }

  add(input: MockAddFeedbackInput): MockFeedbackItem {
    return this.push({
      resourceSlug: input.resourceSlug ?? null,
      communityToolSlug: input.resourceSlug
        ? null
        : (input.communityToolSlug ?? null),
      subject: input.subject ?? null,
      // Empty is stored as absent, the way the server does it — a bare flag is a
      // valid signal and has no body.
      body: input.body?.trim() ? input.body.trim() : null,
      attachmentIds: input.attachmentIds ?? [],
    })
  }

  /**
   * The row a community tool write leaves in the maintainer's review list. A system
   * line: nobody, its writer included, can edit or withdraw it.
   */
  addReviewRow(
    communityToolSlug: string,
    body: string,
    authorName: string,
    status: 'applied' | 'acknowledged' | null,
  ): void {
    this.push({
      communityToolSlug,
      body,
      authorName,
      status,
      isMine: false,
      isSystem: true,
      canEditUntil: null,
    })
  }

  /** Approving a tool settles every review row still open on it. */
  applyPending(communityToolSlug: string, at: Date): void {
    for (const item of this.items) {
      if (
        item.communityToolSlug === communityToolSlug &&
        item.status === null
      ) {
        item.status = 'applied'
        item.reviewedAt = at.toISOString()
      }
    }
  }

  /** Community tools with a review row still open: the maintainer's queue. */
  pendingToolSlugs(): string[] {
    return [
      ...new Set(
        this.items
          .filter((i) => i.communityToolSlug && i.status === null)
          .map((i) => i.communityToolSlug!),
      ),
    ]
  }

  /** One entry's thread, newest last, with the unreviewed count beside it. */
  listFor(target: { resourceSlug: string } | { communityToolSlug: string }): {
    items: MockFeedbackItem[]
    openCount: number
  } {
    const items = this.items.filter((item) =>
      'resourceSlug' in target
        ? item.resourceSlug === target.resourceSlug
        : item.communityToolSlug === target.communityToolSlug,
    )
    return {
      items: items.map(toItem),
      openCount: items.filter((item) => item.status === null).length,
    }
  }

  /** Everything this browser filed, across entries. */
  mine(): MockFeedbackItem[] {
    return this.items.filter((item) => item.isMine).map(toItem)
  }

  dismiss(id: string): void {
    this.requireAuthor(id)
    this.items = this.items.filter((item) => item.id !== id)
  }

  edit(id: string, body: string): void {
    const item = this.requireAuthor(id)
    if (item) {
      item.body = body
      item.editedAt = new Date().toISOString()
    }
  }

  /** The server's `not-author` refusal, for a system line or another browser's note. */
  private requireAuthor(id: string): StoredItem | undefined {
    const item = this.items.find((entry) => entry.id === id)
    if (item && !item.isMine) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only the author can change this',
      })
    }
    return item
  }

  /**
   * Stand-in for the upload endpoint. Returns ids only — there are no bytes here,
   * because what the composer needs to get right is carrying the ids through to
   * submit, and the re-encoding is covered where it actually happens.
   */
  uploadImages(count: number): string[] {
    return Array.from({ length: count }, () => {
      this.counter += 1
      return `att-${this.counter}`
    })
  }
}
