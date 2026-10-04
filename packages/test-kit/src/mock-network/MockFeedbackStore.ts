/**
 * In-memory feedback, so a scenario can post a correction and then read it back.
 *
 * The earlier mock answered `list` with a constant empty page, which meant no test
 * could cover the thing the feature exists for: someone reports a problem and sees
 * their own report land. A scenario that cannot observe its own write proves only
 * that the button does not throw.
 */

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
  canEditUntil: string | null
}

export interface MockAddFeedbackInput {
  resourceSlug?: string
  subject?: string
  body?: string
  attachmentIds?: string[]
}

/** The pseudonym the real server would mint from the visitor cookie. */
const MOCK_ALIAS = 'Curious Ferret'

export class MockFeedbackStore {
  private items: MockFeedbackItem[] = []
  private counter = 0

  /** Pre-existing feedback, for a scenario that starts with a thread already there. */
  seed(items: Partial<MockFeedbackItem>[]): void {
    for (const item of items) this.push(item)
  }

  private push(item: Partial<MockFeedbackItem>): MockFeedbackItem {
    this.counter += 1
    const now = new Date().toISOString()
    const full: MockFeedbackItem = {
      id: `fb-${this.counter}`,
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
      canEditUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      ...item,
    }
    this.items.push(full)
    return full
  }

  add(input: MockAddFeedbackInput): MockFeedbackItem {
    return this.push({
      resourceSlug: input.resourceSlug ?? null,
      subject: input.subject ?? null,
      // Empty is stored as absent, the way the server does it — a bare flag is a
      // valid signal and has no body.
      body: input.body?.trim() ? input.body.trim() : null,
      attachmentIds: input.attachmentIds ?? [],
    })
  }

  /** One entry's thread, newest last, with the unreviewed count beside it. */
  listFor(resourceSlug: string): {
    items: MockFeedbackItem[]
    openCount: number
  } {
    const items = this.items.filter(
      (item) => item.resourceSlug === resourceSlug,
    )
    return {
      items,
      openCount: items.filter((item) => item.status === null).length,
    }
  }

  /** Everything this browser filed, across entries. */
  mine(): MockFeedbackItem[] {
    return this.items.filter((item) => item.isMine)
  }

  dismiss(id: string): void {
    this.items = this.items.filter((item) => item.id !== id)
  }

  edit(id: string, body: string): void {
    const item = this.items.find((entry) => entry.id === id)
    if (item) {
      item.body = body
      item.editedAt = new Date().toISOString()
    }
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
