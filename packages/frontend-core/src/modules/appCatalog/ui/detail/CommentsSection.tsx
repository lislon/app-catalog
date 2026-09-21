import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTRPC } from '~/api/infra/trpc'
import { Button } from '~/ui/button'
import { cn } from '~/lib/utils'
import { formatRelativeTime } from '../../utils/formatRelativeTime'

/**
 * Feedback on one app, from anyone browsing the catalog.
 *
 * Nobody has to log in to leave a comment, so the server attributes each one to a
 * pseudonym derived from an httpOnly cookie ("Curious Ferret"). That cookie is also
 * the only thing that authorises editing or deleting, and only for the first hour —
 * `canEditUntil` arrives from the server as an absolute instant so a skewed client
 * clock cannot show controls the server would refuse.
 */

/** Same shape the input primitive uses, minus the fixed height. */
const FIELD_CLASSES =
  'placeholder:text-muted-foreground dark:bg-input/30 border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong'
}

/** Cmd/Ctrl+Enter submits; plain Enter keeps making paragraphs. */
function isSubmitChord(event: React.KeyboardEvent): boolean {
  return event.key === 'Enter' && (event.metaKey || event.ctrlKey)
}

export function CommentsSection({ appSlug }: { appSlug: string }) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const listOptions = trpc.comments.list.queryOptions({ resourceSlug: appSlug })
  const { data: comments, isLoading, error } = useQuery(listOptions)

  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  /**
   * Most apps have no comments, and an empty form under "no comments yet" is just
   * noise. So the composer stays behind the invitation until someone accepts it —
   * which is also what earns the caret: focus follows the click, never the mount.
   */
  const [composerOpen, setComposerOpen] = useState(false)

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: listOptions.queryKey })

  const add = useMutation(
    trpc.comments.add.mutationOptions({
      onSuccess: () => {
        setDraft('')
        void refresh()
      },
    }),
  )
  const edit = useMutation(
    trpc.comments.edit.mutationOptions({
      onSuccess: () => {
        setEditingId(null)
        void refresh()
      },
    }),
  )
  const remove = useMutation(
    trpc.comments.remove.mutationOptions({ onSuccess: () => void refresh() }),
  )

  const post = () => {
    const body = draft.trim()
    if (body) add.mutate({ resourceSlug: appSlug, body })
  }

  const saveEdit = (id: string) => {
    const body = editDraft.trim()
    if (body) edit.mutate({ id, body })
  }

  // One line for every failed action: three mutations and one query, one place to look.
  const failure = error ?? add.error ?? edit.error ?? remove.error
  const hasComments = !!comments && comments.length > 0

  return (
    <div className="mt-6">
      <h3 className="mb-2 text-sm font-medium">
        Comments
        {comments && comments.length > 0 && (
          <span className="text-muted-foreground ml-1 font-normal">
            ({comments.length})
          </span>
        )}
      </h3>

      {isLoading ? (
        <p className="text-muted-foreground text-xs">Loading comments…</p>
      ) : comments && comments.length > 0 ? (
        <ul className="space-y-3">
          {comments.map((comment) => {
            const canEdit =
              comment.isMine &&
              !!comment.canEditUntil &&
              Date.parse(comment.canEditUntil) > Date.now()

            return (
              <li key={comment.id} className="text-xs">
                <div className="text-muted-foreground flex items-center gap-2">
                  <span className="text-foreground font-medium">
                    {comment.authorName}
                  </span>
                  <span>{formatRelativeTime(comment.createdAt)}</span>
                  {comment.editedAt && <span>(edited)</span>}
                  {canEdit && editingId !== comment.id && (
                    <>
                      <button
                        type="button"
                        className="hover:text-foreground underline"
                        onClick={() => {
                          setEditingId(comment.id)
                          setEditDraft(comment.body)
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="hover:text-destructive underline"
                        onClick={() => remove.mutate({ id: comment.id })}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>

                {editingId === comment.id ? (
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
                          saveEdit(comment.id)
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={!editDraft.trim() || edit.isPending}
                        onClick={() => saveEdit(comment.id)}
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
                  <p className="mt-0.5 whitespace-pre-wrap">{comment.body}</p>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-muted-foreground text-xs">
          No comments yet.{' '}
          {!composerOpen && (
            <button
              type="button"
              className="hover:text-foreground underline"
              onClick={() => setComposerOpen(true)}
            >
              Be the first.
            </button>
          )}
        </p>
      )}

      {(hasComments || composerOpen) && (
        <div
          className={cn(
            'mt-3 space-y-2',
            composerOpen &&
              'animate-in fade-in slide-in-from-top-2 duration-200',
          )}
        >
          <textarea
            autoFocus={composerOpen}
            rows={3}
            className={cn(FIELD_CLASSES)}
            placeholder="Leave a comment…"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (isSubmitChord(event)) {
                event.preventDefault()
                post()
              }
            }}
          />
          <div className="flex items-center gap-3">
            <Button
              type="button"
              size="sm"
              disabled={!draft.trim() || add.isPending}
              onClick={post}
            >
              {add.isPending ? 'Posting…' : 'Post'}
            </Button>
            <span className="text-muted-foreground text-xs">
              Posted under a nickname. You can edit or delete it for one hour.
            </span>
          </div>
        </div>
      )}

      {/* Outside the composer: a failed list query leaves nothing to collapse into. */}
      {failure && (
        <p className="text-destructive mt-2 text-xs">{errorMessage(failure)}</p>
      )}
    </div>
  )
}
