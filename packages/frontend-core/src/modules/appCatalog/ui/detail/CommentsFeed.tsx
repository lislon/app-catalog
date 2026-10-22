import type {
  Claim,
  FeedbackView as Note,
} from '@igstack/app-catalog-backend-core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import React from 'react'
import { useTRPC } from '~/api/infra/trpc'
import { cn } from '~/lib/utils'
import { Button } from '~/ui/button'
import { formatRelativeTime } from '../../utils/formatRelativeTime'
import { attachmentUrl } from './communityDraft'
import type { CommentTarget } from './communityDraft'
import { formatCommunityError } from './communityError'
import { composeComments } from './composeComments'
import type { CommentEntry } from './composeComments'

/** Same shape the input primitive uses, minus the fixed height. */
const FIELD_CLASSES =
  'placeholder:text-muted-foreground dark:bg-input/30 border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50'

const BADGES = {
  pending: { text: 'Pending', className: 'is-pending' },
  used: { text: 'Used as source', className: 'is-used' },
} as const

/**
 * Screenshots sent with a note: a thumbnail strip under the words. The words
 * are the substance and a screenshot is the evidence, so it should be
 * glanceable and openable, not dominate the row.
 */
function AttachmentStrip({ ids }: { ids: string[] }) {
  if (ids.length === 0) return null
  return (
    <ul className="community-shots">
      {ids.map((id) => (
        <li key={id}>
          <a href={attachmentUrl(id)} target="_blank" rel="noreferrer">
            <img
              src={attachmentUrl(id)}
              alt="Attached screenshot"
              loading="lazy"
            />
          </a>
        </li>
      ))}
    </ul>
  )
}

/** Who, when and where it stands, on one small line above the words. */
function Meta({ entry, edited }: { entry: CommentEntry; edited: boolean }) {
  const badge = entry.badge && BADGES[entry.badge]
  return (
    <p className="comment__meta">
      {entry.who && (
        <>
          <span className="comment__who">{entry.who}</span>
          {' · '}
        </>
      )}
      <time dateTime={entry.at} title={entry.at}>
        {formatRelativeTime(entry.at)}
      </time>
      {edited && ' (edited)'}
      {badge && (
        <span
          className={cn('comment__badge', badge.className)}
          data-badge={entry.badge}
        >
          {badge.text}
        </span>
      )}
    </p>
  )
}

/**
 * Everything already said about the entry, under the input: one feed, newest
 * first, one entry per visitor note. See `composeComments` for how claims fold
 * into the notes they came from.
 *
 * Nobody logs in, so the server attributes each note to a pseudonym from an
 * httpOnly cookie, and that cookie is what authorises editing (for an hour) or
 * withdrawing (until someone reviews it). `canEditUntil` arrives as an absolute
 * instant so a skewed client clock cannot show a control the server would refuse.
 */
export function CommentsFeed({
  target,
  claims,
  labelledBy,
}: {
  target: CommentTarget
  claims: Claim[]
  /** Id of the heading that names the list. */
  labelledBy: string
}) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const listOptions = trpc.feedback.list.queryOptions(target)
  const { data, error, isPending } = useQuery(listOptions)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editDraft, setEditDraft] = React.useState('')

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: listOptions.queryKey })
  const edit = useMutation(
    trpc.feedback.edit.mutationOptions({
      onSuccess: () => {
        setEditingId(null)
        void refresh()
      },
    }),
  )
  const dismiss = useMutation(
    trpc.feedback.dismiss.mutationOptions({
      onSuccess: () => {
        void refresh()
        // A tool's row counts its comments.
        if ('communityToolSlug' in target) {
          void queryClient.invalidateQueries({
            queryKey: trpc.communityTools.pathKey(),
          })
        }
      },
    }),
  )
  const saveEdit = (id: string) => {
    const body = editDraft.trim()
    if (body) edit.mutate({ id, body })
  }

  const entries =
    data || error ? composeComments(data?.items ?? [], claims) : []
  const failure = error ?? edit.error ?? dismiss.error

  const noteBody = (note: Note) => {
    const canEdit =
      note.isMine &&
      !!note.canEditUntil &&
      Date.parse(note.canEditUntil) > Date.now()
    // Withdrawing stays available for as long as nobody has reviewed it.
    const canDismiss = note.isMine && note.status === null
    const editing = editingId === note.id
    return (
      <>
        {editing ? (
          <div className="mt-1 space-y-2">
            <textarea
              autoFocus
              rows={3}
              className={FIELD_CLASSES}
              aria-label="Edit your note"
              value={editDraft}
              onChange={(e) => {
                setEditDraft(e.target.value)
                if (edit.isError) edit.reset()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  saveEdit(note.id)
                }
              }}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                disabled={!editDraft.trim() || edit.isPending}
                onClick={() => saveEdit(note.id)}
              >
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setEditingId(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p
            data-feedback-body=""
            className={cn('comment__text', !note.body && 'is-empty')}
          >
            {note.body ??
              (note.attachmentIds.length > 0
                ? 'Screenshot only — no words added.'
                : 'Flagged as out of date — no detail given.')}
          </p>
        )}
        <AttachmentStrip ids={note.attachmentIds} />
        {note.reviewerReply && (
          <p className="comment__reply">↳ {note.reviewerReply}</p>
        )}
        {!editing && (canEdit || canDismiss) && (
          <p className="comment__actions">
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(note.id)
                  setEditDraft(note.body ?? '')
                }}
              >
                Edit
              </button>
            )}
            {canDismiss && (
              <button
                type="button"
                className="is-destructive"
                onClick={() => dismiss.mutate({ id: note.id })}
              >
                Dismiss
              </button>
            )}
          </p>
        )}
      </>
    )
  }

  return (
    <>
      {isPending ? (
        <div
          className="comments-skeleton"
          aria-busy="true"
          aria-labelledby={labelledBy}
        >
          <span className="sr-only" role="status">
            Loading comments…
          </span>
          <div className="comments-skeleton__item" />
          <div className="comments-skeleton__item" />
          <div className="comments-skeleton__item" />
        </div>
      ) : entries.length > 0 ? (
        <ul className="comments" aria-labelledby={labelledBy}>
          {entries.map((entry) => (
            <li key={entry.key} className="comment">
              <Meta entry={entry} edited={!!entry.note?.editedAt} />
              {entry.note?.isSystem ? (
                <p className="comment__text is-system" data-system-line="">
                  {entry.text}
                </p>
              ) : entry.note ? (
                noteBody(entry.note)
              ) : (
                <p className="comment__text">{entry.text}</p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="comments-empty">
          No comments yet. Be the first to share what you know.
        </p>
      )}
      {failure && (
        <p className="know-more-error">{formatCommunityError(failure)}</p>
      )}
    </>
  )
}
