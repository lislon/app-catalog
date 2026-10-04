import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTRPC } from '~/api/infra/trpc'
import { Button } from '~/ui/button'
import { cn } from '~/lib/utils'
import { formatRelativeTime } from '../../utils/formatRelativeTime'

/**
 * Feedback on one app, from anyone browsing the catalog.
 *
 * Nobody has to log in, so the server attributes each item to a pseudonym derived from
 * an httpOnly cookie ("Curious Ferret"). That cookie is also the only thing that
 * authorises editing or withdrawing: editing closes after an hour, withdrawing stays
 * open for as long as nobody has reviewed it. `canEditUntil` arrives as an absolute
 * instant so a skewed client clock cannot show a control the server would refuse.
 */

/** Same shape the input primitive uses, minus the fixed height. */
const FIELD_CLASSES =
  'placeholder:text-muted-foreground dark:bg-input/30 border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong'
}

/**
 * What a maintainer did with an item, as the reader sees it.
 *
 * `applied` is the point of the whole thing: feedback that improved the entry gets
 * public credit, so the next person can see that reporting changes the catalog. Nobody
 * sets these from the UI — the review tooling writes them.
 *
 * There is no chip for unreviewed. Open is the modal state, so a pill on every
 * unreviewed row would pay the most expensive encoding for the least informative fact;
 * absence carries it, and that leaves a chip meaning "a maintainer acted here". The
 * label is also just `Applied` — the gratitude belongs in the reply prose below it,
 * where it reads as a person rather than a system shouting thanks.
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

function StatusChip({ status }: { status: 'applied' | 'acknowledged' }) {
  const label = STATUS_LABELS[status]
  return (
    <span className={cn('comment-chip', label.className)} title={label.title}>
      {label.text}
    </span>
  )
}

/** The maintainers' answer, attributed to the team rather than a pseudonym. */
function ReviewerReply({ reply }: { reply: string }) {
  return (
    <div className="border-primary/45 bg-muted/60 mt-1.5 rounded-r-lg border-l-2 px-2.5 py-1.5">
      <span className="text-muted-foreground font-medium">Catalog team</span>
      <p className="mt-0.5 whitespace-pre-wrap">{reply}</p>
    </div>
  )
}

/** Cmd/Ctrl+Enter submits; plain Enter keeps making paragraphs. */
function isSubmitChord(event: React.KeyboardEvent): boolean {
  return event.key === 'Enter' && (event.metaKey || event.ctrlKey)
}

export function FeedbackSection({ appSlug }: { appSlug: string }) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const listOptions = trpc.feedback.list.queryOptions({ resourceSlug: appSlug })
  const { data, isLoading, error } = useQuery(listOptions)

  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  /**
   * The composer stays behind the invitation until someone accepts it — which is also
   * what earns the caret: focus follows the click, never the mount.
   */
  const [composerOpen, setComposerOpen] = useState(false)

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: listOptions.queryKey })

  const add = useMutation(
    trpc.feedback.add.mutationOptions({
      onSuccess: () => {
        setDraft('')
        setComposerOpen(false)
        void refresh()
      },
    }),
  )
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

  /** Both fields are optional, so this submits whatever there is — including nothing. */
  const send = () => add.mutate({ resourceSlug: appSlug, body: draft.trim() })

  const saveEdit = (id: string) => {
    const body = editDraft.trim()
    if (body) edit.mutate({ id, body })
  }

  // One line for every failed action: three mutations and one query, one place to look.
  const failure = error ?? add.error ?? edit.error ?? dismiss.error
  const items = data?.items ?? []
  const openCount = data?.openCount ?? 0

  return (
    <div className="mt-7">
      <h3 className="section-label mb-1.5 flex items-center gap-2">
        Notes &amp; requests
        {items.length > 0 && (
          <span className="text-muted-foreground font-normal tracking-normal normal-case">
            ({items.length})
          </span>
        )}
        {openCount > 0 && (
          <span
            className="feedback-open-count"
            aria-label={`${openCount} awaiting review`}
          >
            {openCount} open
          </span>
        )}
      </h3>

      {isLoading ? (
        <p className="text-muted-foreground text-xs">Loading…</p>
      ) : items.length > 0 ? (
        <ul className="space-y-3">
          {items.map((item) => {
            const canEdit =
              item.isMine &&
              !!item.canEditUntil &&
              Date.parse(item.canEditUntil) > Date.now()
            // Withdrawing stays available for as long as nobody has reviewed it.
            const canDismiss = item.isMine && item.status === null

            return (
              <li key={item.id} className="text-xs">
                <div className="text-muted-foreground flex items-center gap-2">
                  <span className="text-foreground font-medium">
                    {item.authorName}
                  </span>
                  <span>{formatRelativeTime(item.createdAt)}</span>
                  {item.editedAt && <span>(edited)</span>}
                  {item.status && <StatusChip status={item.status} />}
                  {canEdit && editingId !== item.id && (
                    <button
                      type="button"
                      className="hover:text-foreground underline"
                      onClick={() => {
                        setEditingId(item.id)
                        setEditDraft(item.body ?? '')
                      }}
                    >
                      Edit
                    </button>
                  )}
                  {canDismiss && editingId !== item.id && (
                    <button
                      type="button"
                      className="hover:text-destructive underline"
                      onClick={() => dismiss.mutate({ id: item.id })}
                    >
                      Dismiss
                    </button>
                  )}
                </div>

                {editingId === item.id ? (
                  <div className="mt-1 space-y-2">
                    <textarea
                      autoFocus
                      rows={3}
                      className={cn(FIELD_CLASSES)}
                      value={editDraft}
                      onChange={(event) => setEditDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (isSubmitChord(event)) {
                          event.preventDefault()
                          saveEdit(item.id)
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={!editDraft.trim() || edit.isPending}
                        onClick={() => saveEdit(item.id)}
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
                ) : item.body ? (
                  <p className="mt-0.5 whitespace-pre-wrap">{item.body}</p>
                ) : (
                  // A bare flag: no words, still a signal. Say so rather than
                  // rendering an empty row someone has to interpret.
                  <p className="text-muted-foreground mt-0.5 italic">
                    Flagged as out of date — no detail given.
                  </p>
                )}

                {item.reviewerReply && (
                  <ReviewerReply reply={item.reviewerReply} />
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-muted-foreground text-xs">
          Nothing here yet. Spotted something out of date or missing?
        </p>
      )}

      {composerOpen ? (
        <div className="animate-in fade-in slide-in-from-top-2 mt-3 space-y-2 duration-200">
          <textarea
            autoFocus
            rows={3}
            className={cn(FIELD_CLASSES)}
            placeholder="What should change?"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (isSubmitChord(event)) {
                event.preventDefault()
                send()
              }
            }}
          />
          <div className="flex items-center gap-3">
            <Button
              type="button"
              size="sm"
              disabled={add.isPending}
              onClick={send}
            >
              {add.isPending ? 'Sending…' : 'Send'}
            </Button>
            <span className="text-muted-foreground text-xs">
              Posted under a nickname. You can edit it for an hour, or withdraw
              it until someone answers.
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setComposerOpen(true)}
          >
            ✎ Suggest a change
          </Button>
        </div>
      )}

      {/* Outside the composer: a failed list query leaves nothing to collapse into. */}
      {failure && (
        <p className="text-destructive mt-2 text-xs">{errorMessage(failure)}</p>
      )}
    </div>
  )
}
