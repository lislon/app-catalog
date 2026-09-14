import { getDbClient } from '../../db/client'
import type { Visitor } from './visitorIdentity'

/** How long an author may edit or delete their own comment. */
export const EDIT_WINDOW_MS = 60 * 60 * 1000

export const MAX_BODY_LENGTH = 1000

/** One comment as a client sees it. Never carries an author hash. */
export interface CommentView {
  id: string
  authorName: string
  body: string
  createdAt: string
  /** Null when the comment has never been edited. */
  editedAt: string | null
  /** Whether this browser wrote it — what makes Edit and Delete appear. */
  isMine: boolean
  /**
   * The absolute instant this browser's edit window closes, or null when it is not
   * this browser's comment. Absolute rather than a remaining duration so a client
   * with a skewed clock still hides the controls at the same moment the server
   * starts refusing the edit.
   */
  canEditUntil: string | null
}

function toView(
  row: {
    id: string
    authorHash: string
    authorAlias: string
    body: string
    editedAt: Date | null
    createdAt: Date
  },
  visitor: Visitor | null,
): CommentView {
  const isMine = !!visitor && row.authorHash === visitor.hash
  return {
    id: row.id,
    authorName: row.authorAlias,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    editedAt: row.editedAt?.toISOString() ?? null,
    isMine,
    canEditUntil: isMine
      ? new Date(row.createdAt.getTime() + EDIT_WINDOW_MS).toISOString()
      : null,
  }
}

async function resourceIdForSlug(slug: string): Promise<string | null> {
  const resource = await getDbClient().dbResource.findUnique({
    where: { slug },
    select: { id: true },
  })
  return resource?.id ?? null
}

/** Oldest first: a comment thread reads top to bottom. */
export async function listComments(
  resourceSlug: string,
  visitor: Visitor | null,
): Promise<CommentView[]> {
  const resourceId = await resourceIdForSlug(resourceSlug)
  if (!resourceId) return []

  const rows = await getDbClient().dbComment.findMany({
    where: { resourceId },
    orderBy: { createdAt: 'asc' },
  })
  return rows.map((row) => toView(row, visitor))
}

export class CommentError extends Error {
  constructor(
    readonly reason: 'not-found' | 'not-author' | 'window-closed' | 'empty',
    message: string,
  ) {
    super(message)
  }
}

function normaliseBody(body: string): string {
  const trimmed = body.trim()
  if (!trimmed) throw new CommentError('empty', 'A comment cannot be empty')
  return trimmed.slice(0, MAX_BODY_LENGTH)
}

export async function addComment(
  resourceSlug: string,
  body: string,
  visitor: Visitor,
): Promise<CommentView> {
  const resourceId = await resourceIdForSlug(resourceSlug)
  if (!resourceId) {
    throw new CommentError('not-found', `Unknown resource: ${resourceSlug}`)
  }

  const row = await getDbClient().dbComment.create({
    data: {
      resourceId,
      authorHash: visitor.hash,
      authorAlias: visitor.alias,
      body: normaliseBody(body),
    },
  })
  return toView(row, visitor)
}

/**
 * Load a comment and check this visitor may still change it.
 *
 * The window is enforced here, not in the UI: the controls disappearing is a
 * courtesy, and a request that arrives a second late must still be refused.
 */
async function loadOwn(id: string, visitor: Visitor) {
  const row = await getDbClient().dbComment.findUnique({ where: { id } })
  if (!row) throw new CommentError('not-found', 'Comment no longer exists')
  if (row.authorHash !== visitor.hash) {
    throw new CommentError('not-author', 'Only the author can change a comment')
  }
  if (Date.now() > row.createdAt.getTime() + EDIT_WINDOW_MS) {
    throw new CommentError(
      'window-closed',
      'A comment can only be changed in the first hour',
    )
  }
  return row
}

export async function editComment(
  id: string,
  body: string,
  visitor: Visitor,
): Promise<CommentView> {
  await loadOwn(id, visitor)

  const row = await getDbClient().dbComment.update({
    where: { id },
    data: { body: normaliseBody(body), editedAt: new Date() },
  })
  return toView(row, visitor)
}

export async function deleteComment(
  id: string,
  visitor: Visitor,
): Promise<{ id: string }> {
  await loadOwn(id, visitor)
  await getDbClient().dbComment.delete({ where: { id } })
  return { id }
}
