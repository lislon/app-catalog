import { getDbClient } from '../../db/client'
import type { Actor } from '../visitor/visitorIdentity'

/** How long an author may edit their own wording. */
export const EDIT_WINDOW_MS = 60 * 60 * 1000

export const MAX_BODY_LENGTH = 1000
export const MAX_SUBJECT_LENGTH = 120
export const MAX_ATTACHMENTS = 3

/** One piece of feedback as a client sees it. Never carries an author hash. */
export interface FeedbackView {
  id: string
  authorName: string
  /** Null when the visitor sent a bare flag with no words. */
  body: string | null
  /** What they were looking for, on a catalog-level ask. Null on entry feedback. */
  subject: string | null
  /** Slug of the entry this is about, or null for a catalog-level ask. */
  resourceSlug: string | null
  /** Display name of that entry, so the tracker can label a row without a second query. */
  resourceName: string | null
  attachmentIds: string[]
  status: 'applied' | 'acknowledged' | null
  reviewerReply: string | null
  /** When a maintainer last touched it — what "unread" is computed against. */
  reviewedAt: string | null
  createdAt: string
  editedAt: string | null
  /** Whether this browser wrote it — what makes Edit and Dismiss appear. */
  isMine: boolean
  /**
   * The absolute instant this browser's edit window closes, or null when it is not
   * theirs. Absolute rather than a remaining duration so a client with a skewed clock
   * hides the control at the same moment the server starts refusing the edit.
   */
  canEditUntil: string | null
}

type Row = {
  id: string
  authorHash: string
  authorAlias: string
  body: string | null
  subject: string | null
  status: 'applied' | 'acknowledged' | null
  reviewerReply: string | null
  reviewedAt: Date | null
  editedAt: Date | null
  createdAt: Date
  resource?: { slug: string; displayName: string } | null
  attachments?: { id: string }[]
}

function toView(row: Row, actor: Actor | null): FeedbackView {
  const isMine = !!actor && row.authorHash === actor.hash
  return {
    id: row.id,
    authorName: row.authorAlias,
    body: row.body,
    subject: row.subject,
    resourceSlug: row.resource?.slug ?? null,
    resourceName: row.resource?.displayName ?? null,
    attachmentIds: (row.attachments ?? []).map((a) => a.id),
    status: row.status,
    reviewerReply: row.reviewerReply,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    editedAt: row.editedAt?.toISOString() ?? null,
    isMine,
    canEditUntil: isMine
      ? new Date(row.createdAt.getTime() + EDIT_WINDOW_MS).toISOString()
      : null,
  }
}

const WITH_RELATIONS = {
  resource: { select: { slug: true, displayName: true } },
  attachments: { select: { id: true } },
} as const

async function resourceIdForSlug(slug: string): Promise<string | null> {
  const resource = await getDbClient().dbResource.findUnique({
    where: { slug },
    select: { id: true },
  })
  return resource?.id ?? null
}

export interface FeedbackList {
  items: FeedbackView[]
  /** Unreviewed count — what the badge shows. `status IS NULL` is the whole definition. */
  openCount: number
}

/** Oldest first: a thread reads top to bottom. */
export async function listFeedback(
  resourceSlug: string,
  actor: Actor | null,
): Promise<FeedbackList> {
  const resourceId = await resourceIdForSlug(resourceSlug)
  if (!resourceId) return { items: [], openCount: 0 }

  const rows = await getDbClient().dbFeedback.findMany({
    where: { resourceId },
    orderBy: { createdAt: 'asc' },
    include: WITH_RELATIONS,
  })
  return {
    items: rows.map((row) => toView(row, actor)),
    openCount: rows.filter((row) => row.status === null).length,
  }
}

/**
 * Everything this browser filed, across entries, for the tracker.
 *
 * Sorted the way the tracker renders: unreviewed first, then newest. Postgres sorts
 * NULLs last by default, so `status` ascending would bury the pending rows — hence the
 * explicit two-key ordering rather than relying on the default.
 */
export async function listMyFeedback(
  actor: Actor | null,
): Promise<FeedbackView[]> {
  if (!actor) return []
  const rows = await getDbClient().dbFeedback.findMany({
    where: { authorHash: actor.hash },
    orderBy: [
      { status: { sort: 'asc', nulls: 'first' } },
      { createdAt: 'desc' },
    ],
    include: WITH_RELATIONS,
  })
  return rows.map((row) => toView(row, actor))
}

export class FeedbackError extends Error {
  constructor(
    readonly reason:
      | 'not-found'
      | 'not-author'
      | 'window-closed'
      | 'already-reviewed'
      | 'empty'
      | 'too-many-attachments',
    message: string,
  ) {
    super(message)
  }
}

function normaliseBody(body: string | undefined | null): string | null {
  if (body === undefined || body === null) return null
  const trimmed = body.trim()
  // A bare flag is a valid signal, so empty is stored as absent rather than refused.
  return trimmed ? trimmed.slice(0, MAX_BODY_LENGTH) : null
}

export interface AddFeedbackInput {
  /** Omitted for a catalog-level ask. */
  resourceSlug?: string
  /** Required when there is no resourceSlug — it is the substance of the ask. */
  subject?: string
  body?: string
  attachmentIds?: string[]
}

export async function addFeedback(
  input: AddFeedbackInput,
  actor: Actor,
): Promise<FeedbackView> {
  const { resourceSlug, subject, body, attachmentIds = [] } = input

  if (!resourceSlug && !subject?.trim()) {
    throw new FeedbackError(
      'empty',
      'Tell us which entry this is about, or what you were looking for',
    )
  }
  if (attachmentIds.length > MAX_ATTACHMENTS) {
    throw new FeedbackError(
      'too-many-attachments',
      `Up to ${MAX_ATTACHMENTS} images`,
    )
  }

  let resourceId: string | null = null
  if (resourceSlug) {
    resourceId = await resourceIdForSlug(resourceSlug)
    if (!resourceId) {
      throw new FeedbackError('not-found', `Unknown resource: ${resourceSlug}`)
    }
  }

  const row = await getDbClient().dbFeedback.create({
    data: {
      resourceId,
      subject: resourceId ? null : subject!.trim().slice(0, MAX_SUBJECT_LENGTH),
      authorHash: actor.hash,
      authorAlias: actor.alias,
      body: normaliseBody(body),
      // Only claim attachments this browser uploaded and nobody has claimed yet, so an
      // id guessed from someone else's upload cannot be attached to your feedback.
      attachments: {
        connect: attachmentIds.map((id) => ({ id })),
      },
    },
    include: WITH_RELATIONS,
  })
  return toView(row, actor)
}

/**
 * Load a row and check this actor may still change its wording.
 *
 * Enforced here, not in the UI: the control disappearing is a courtesy, and a request
 * that arrives a second late must still be refused.
 */
async function loadOwnForEdit(id: string, actor: Actor) {
  const row = await getDbClient().dbFeedback.findUnique({ where: { id } })
  if (!row) throw new FeedbackError('not-found', 'This no longer exists')
  if (row.authorHash !== actor.hash) {
    throw new FeedbackError('not-author', 'Only the author can change this')
  }
  if (Date.now() > row.createdAt.getTime() + EDIT_WINDOW_MS) {
    throw new FeedbackError(
      'window-closed',
      'Wording can only be changed in the first hour',
    )
  }
  return row
}

export async function editFeedback(
  id: string,
  body: string,
  actor: Actor,
): Promise<FeedbackView> {
  await loadOwnForEdit(id, actor)
  const row = await getDbClient().dbFeedback.update({
    where: { id },
    data: { body: normaliseBody(body), editedAt: new Date() },
    include: WITH_RELATIONS,
  })
  return toView(row, actor)
}

/**
 * Withdraw your own feedback.
 *
 * Allowed for as long as nobody has reviewed it, with no time limit — the edit window
 * exists to stop someone rewriting words others have already read, and that reasoning
 * does not apply to withdrawing something no maintainer has acted on. Once reviewed it
 * is public record carrying a maintainer's reply, so withdrawing would delete their
 * answer; from then on it is refused.
 */
export async function dismissFeedback(
  id: string,
  actor: Actor,
): Promise<{ id: string }> {
  const row = await getDbClient().dbFeedback.findUnique({ where: { id } })
  if (!row) throw new FeedbackError('not-found', 'This no longer exists')
  if (row.authorHash !== actor.hash) {
    throw new FeedbackError('not-author', 'Only the author can withdraw this')
  }
  if (row.status !== null) {
    throw new FeedbackError(
      'already-reviewed',
      'This has been answered, so it stays on the entry',
    )
  }
  await getDbClient().dbFeedback.delete({ where: { id } })
  return { id }
}
