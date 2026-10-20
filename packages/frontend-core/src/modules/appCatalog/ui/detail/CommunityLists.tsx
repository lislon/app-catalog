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

/** Same shape the input primitive uses, minus the fixed height. */
const FIELD_CLASSES =
  'placeholder:text-muted-foreground dark:bg-input/30 border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50'

/**
 * What a maintainer did with a note. `applied` is the point of the whole
 * thing: a note that improved the entry gets public credit, so the next person
 * can see that reporting changes the catalog. The review tooling sets these.
 */
const STATUS_LABELS = {
  applied: {
    text: 'Applied',
    className: 'comment-chip-applied',
    title:
      'This improved the entry — the catalog now carries what it said. Thank you.',
  },
  acknowledged: {
    text: 'Seen',
    className: 'comment-chip-seen',
    title: 'A maintainer read this and left the entry as it was.',
  },
} as const

/** `feedback:<id>` is only meaningful to a maintainer; a reader sees where it came from. */
function originLabel(origin: string | undefined): string | null {
  if (!origin) return null
  return origin.startsWith('feedback:') ? 'from visitor feedback' : origin
}

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

function Row({
  meta,
  className,
  children,
}: {
  meta: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <li className={cn('community-row', className)}>
      <div className="community-row__main">{children}</div>
      <span className="community-row__meta">{meta}</span>
    </li>
  )
}

function ClaimRow({ claim }: { claim: Claim }) {
  const origin = originLabel(claim.origin)
  const archived = claim.status === 'archived'
  return (
    <Row
      meta={origin ? `${origin} · ${claim.addedAt}` : claim.addedAt}
      className={archived ? 'is-archived' : undefined}
    >
      <p className="community-row__text">{claim.text}</p>
      {archived && claim.archiveReason && (
        <p className="community-row__reason">
          Archived{claim.archivedAt ? ` ${claim.archivedAt}` : ''} —{' '}
          {claim.archiveReason}
        </p>
      )}
    </Row>
  )
}

function SubSection({
  title,
  id,
  count,
  children,
}: {
  title: string
  id: string
  count: number
  children: React.ReactNode
}) {
  if (count === 0) return null
  return (
    <section className="community-sub" data-community-group={id}>
      <h3 className="community-sub__title">
        {title}{' '}
        <span className="community-sub__n" data-count="">
          {count}
        </span>
      </h3>
      <ul className="community-rows">{children}</ul>
    </section>
  )
}

/**
 * Everything already said about the entry, under the input: notes waiting for
 * review (with claims still being verified), the facts the card relies on,
 * answered notes, and archived claims folded away. An empty group is not shown.
 *
 * Nobody logs in, so the server attributes each note to a pseudonym from an
 * httpOnly cookie, and that cookie is what authorises editing (for an hour) or
 * withdrawing (until someone reviews it). `canEditUntil` arrives as an absolute
 * instant so a skewed client clock cannot show a control the server would refuse.
 */
export function CommunityLists({
  appSlug,
  claims,
}: {
  appSlug: string
  claims: Claim[]
}) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const listOptions = trpc.feedback.list.queryOptions({ resourceSlug: appSlug })
  const { data, error } = useQuery(listOptions)
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
    trpc.feedback.dismiss.mutationOptions({ onSuccess: () => void refresh() }),
  )
  const saveEdit = (id: string) => {
    const body = editDraft.trim()
    if (body) edit.mutate({ id, body })
  }

  const notes = data?.items ?? []
  const inReview = [
    ...notes
      .filter((n) => n.status === null)
      .map((n) => ({ at: Date.parse(n.createdAt), note: n })),
    ...claims
      .filter((c) => c.status === 'review')
      .map((c) => ({ at: Date.parse(c.addedAt), claim: c })),
  ].sort((a, b) => b.at - a.at)
  const facts = claims.filter((c) => c.status === 'active')
  const answered = notes.filter((n) => n.status !== null)
  const archived = claims.filter((c) => c.status === 'archived')
  const failure = error ?? edit.error ?? dismiss.error

  const noteRow = (note: Note) => {
    const canEdit =
      note.isMine &&
      !!note.canEditUntil &&
      Date.parse(note.canEditUntil) > Date.now()
    // Withdrawing stays available for as long as nobody has reviewed it.
    const canDismiss = note.isMine && note.status === null
    const editing = editingId === note.id
    return (
      <Row
        key={note.id}
        meta={`${note.authorName} · ${formatRelativeTime(note.createdAt)}${note.editedAt ? ' (edited)' : ''}`}
      >
        {editing ? (
          <div className="mt-1 space-y-2">
            <textarea
              autoFocus
              rows={3}
              className={FIELD_CLASSES}
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
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
            className={cn('community-row__text', !note.body && 'is-empty')}
          >
            {note.body ??
              (note.attachmentIds.length > 0
                ? 'Screenshot only — no words added.'
                : 'Flagged as out of date — no detail given.')}
          </p>
        )}
        <AttachmentStrip ids={note.attachmentIds} />
        {note.status && (
          <p className="community-row__reply">
            <span
              className={cn(
                'comment-chip',
                STATUS_LABELS[note.status].className,
              )}
              title={STATUS_LABELS[note.status].title}
            >
              {STATUS_LABELS[note.status].text}
            </span>
            {note.reviewerReply && (
              <span className="whitespace-pre-wrap">{note.reviewerReply}</span>
            )}
          </p>
        )}
        {!editing && (canEdit || canDismiss) && (
          <p className="community-row__actions">
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
      </Row>
    )
  }

  return (
    <>
      <SubSection title="Notes in review" id="review" count={inReview.length}>
        {inReview.map((entry, i) =>
          'note' in entry ? (
            noteRow(entry.note)
          ) : (
            <ClaimRow key={`claim-${i}`} claim={entry.claim} />
          ),
        )}
      </SubSection>
      <SubSection title="Facts we rely on" id="facts" count={facts.length}>
        {facts.map((c, i) => (
          <ClaimRow key={`${i}-${c.text}`} claim={c} />
        ))}
      </SubSection>
      <SubSection title="Answered" id="answered" count={answered.length}>
        {answered.map(noteRow)}
      </SubSection>
      {archived.length > 0 && (
        <details className="community-sub community-archived">
          <summary>Archived ({archived.length})</summary>
          <ul className="community-rows">
            {archived.map((c, i) => (
              <ClaimRow key={`${i}-${c.text}`} claim={c} />
            ))}
          </ul>
        </details>
      )}
      {failure && (
        <p className="know-more-error">
          {failure instanceof Error ? failure.message : 'Something went wrong'}
        </p>
      )}
    </>
  )
}
