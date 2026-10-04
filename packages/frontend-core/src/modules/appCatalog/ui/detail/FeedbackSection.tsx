import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
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

/**
 * Where a half-typed draft lives while it is not submitted.
 *
 * The detail card mounts this section inside a tab panel, and a panel is unmounted
 * while its tab is not the active one — so component state alone loses whatever
 * someone had typed the moment they look at another tab, and again if they close the
 * card. Losing someone's words is the one failure this feature cannot afford: the
 * whole premise is that reporting costs almost nothing, and "I typed it and it
 * vanished" is how a person learns not to bother.
 *
 * Session rather than local storage: a draft is in-flight work, not a preference,
 * and it should not still be waiting weeks later in a browser nobody remembers using.
 * Keyed by slug so two entries do not share one draft.
 */
function draftKey(slug: string): string {
  return `ac.feedback.draft.${slug}`
}

function readDraft(slug: string): string {
  try {
    return sessionStorage.getItem(draftKey(slug)) ?? ''
  } catch {
    // Storage can throw outright in a locked-down context; a lost draft is not
    // worth taking the section down over.
    return ''
  }
}

function writeDraft(slug: string, value: string): void {
  try {
    if (value) sessionStorage.setItem(draftKey(slug), value)
    else sessionStorage.removeItem(draftKey(slug))
  } catch {
    /* see readDraft */
  }
}

/** Mirrors the server's cap, which refuses anything above it regardless. */
const MAX_ATTACHMENTS = 3

const UPLOAD_URL = '/api/feedback-attachments/upload'

/** One already-uploaded image waiting to be submitted with the words. */
interface PendingImage {
  id: string
  name: string
}

/**
 * Images are uploaded the moment they are picked, so the draft holds ids rather than
 * files — which is also why they have to persist alongside the text. A tab panel
 * unmounts whenever its tab is not the active one, and someone who attached three
 * screenshots and glanced at Overview should not come back to none.
 *
 * Dropping an id here does NOT delete the image; the server sweeps whatever is never
 * submitted. That keeps "remove" instant and offline-safe.
 */
function attachmentsKey(slug: string): string {
  return `ac.feedback.images.${slug}`
}

function readAttachments(slug: string): PendingImage[] {
  try {
    const raw = sessionStorage.getItem(attachmentsKey(slug))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (entry): entry is PendingImage =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as PendingImage).id === 'string' &&
        typeof (entry as PendingImage).name === 'string',
    )
  } catch {
    // Unparseable or unreadable storage is the same as no attachments — see readDraft.
    return []
  }
}

function writeAttachments(slug: string, images: PendingImage[]): void {
  try {
    if (images.length > 0) {
      sessionStorage.setItem(attachmentsKey(slug), JSON.stringify(images))
    } else {
      sessionStorage.removeItem(attachmentsKey(slug))
    }
  } catch {
    /* see readDraft */
  }
}

/** The stored image, at whatever size the browser lays it out. */
function attachmentUrl(id: string): string {
  return `/api/feedback-attachments/${id}`
}

/**
 * Images already submitted with a request. A thumbnail strip rather than inline
 * full-width: the words are the substance and a screenshot is the evidence, so it
 * should be glanceable and openable, not dominate the row.
 */
function AttachmentStrip({ ids }: { ids: string[] }) {
  if (ids.length === 0) return null
  return (
    <ul className="mt-1.5 flex flex-wrap gap-1.5">
      {ids.map((id) => (
        <li key={id}>
          <a
            href={attachmentUrl(id)}
            target="_blank"
            rel="noreferrer"
            className="border-border hover:border-ring block overflow-hidden rounded border transition-colors"
          >
            <img
              src={attachmentUrl(id)}
              alt="Attached screenshot"
              loading="lazy"
              className="h-16 w-24 object-cover"
            />
          </a>
        </li>
      ))}
    </ul>
  )
}

export function FeedbackSection({
  appSlug,
  /**
   * Asked to open by the card's band, which is where the affordance now lives —
   * at the foot of this panel it was below the fold of a tab nobody opens unless
   * they already know what is in it.
   *
   * A count of how many times it has asked, so a second ask re-opens the composer
   * the first one closed on send. A boolean could not say "again".
   */
  openComposer = 0,
}: {
  appSlug: string
  openComposer?: number
}) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const listOptions = trpc.feedback.list.queryOptions({ resourceSlug: appSlug })
  const { data, isLoading, error } = useQuery(listOptions)

  // Seeded from storage so a draft survives the tab panel unmounting under it.
  const [draft, setDraft] = useState(() => readDraft(appSlug))
  const [images, setImages] = useState<PendingImage[]>(() =>
    readAttachments(appSlug),
  )
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  /**
   * The composer stays behind the invitation until someone accepts it — which is also
   * what earns the caret: focus follows the click, never the mount. A recovered draft
   * reopens it, otherwise the text would be held but invisible.
   */
  const [composerOpen, setComposerOpen] = useState(
    () =>
      openComposer > 0 ||
      !!readDraft(appSlug) ||
      readAttachments(appSlug).length > 0,
  )

  // The band asked for the composer while this panel was unmounted, so honour it on
  // arrival. The request is NOT cleared from here: doing so removed the tab from the
  // strip (it only exists when there is something in it), which bounced the active
  // tab back to the first one — the composer was deleting the tab it had opened.
  useEffect(() => {
    if (openComposer > 0) setComposerOpen(true)
  }, [openComposer])

  const updateDraft = (value: string) => {
    setDraft(value)
    writeDraft(appSlug, value)
  }

  const updateImages = (next: PendingImage[]) => {
    setImages(next)
    writeAttachments(appSlug, next)
  }

  /**
   * Upload on pick, not on send.
   *
   * It costs a round trip before anyone has committed to posting, and it buys the two
   * things that matter: the person sees whether their screenshot actually arrived
   * while they can still do something about it, and Send stays a single fast request
   * that cannot half-fail with three images in flight.
   */
  const attach = async (picked: FileList | null) => {
    const files = [...(picked ?? [])]
    if (files.length === 0) return

    const room = MAX_ATTACHMENTS - images.length
    if (room <= 0) {
      setUploadError(`Up to ${MAX_ATTACHMENTS} images`)
      return
    }

    setUploadError(null)
    setUploading(true)
    try {
      const form = new FormData()
      for (const file of files.slice(0, room)) form.append('image', file)

      const response = await fetch(UPLOAD_URL, {
        method: 'POST',
        body: form,
        // The visitor cookie is the identity the upload is recorded against, and it
        // is httpOnly — so it has to ride along explicitly.
        credentials: 'same-origin',
      })
      // Unknown rather than a declared shape: this is a JSON body off the wire, and
      // the error path exists precisely for responses that are not what we expect.
      const payload: unknown = await response.json().catch(() => null)
      const field = (key: string): unknown =>
        typeof payload === 'object' && payload !== null
          ? (payload as Record<string, unknown>)[key]
          : undefined

      if (!response.ok) {
        const reported = field('error')
        setUploadError(
          typeof reported === 'string'
            ? reported
            : 'Could not attach that image',
        )
        return
      }

      const ids = field('ids')
      if (!Array.isArray(ids)) {
        setUploadError('Could not attach that image')
        return
      }
      updateImages([
        ...images,
        ...ids.map((id, index) => ({
          id: String(id),
          name: files[index]?.name ?? 'image',
        })),
      ])
      if (files.length > room) {
        setUploadError(`Only the first ${room} were attached`)
      }
    } catch {
      setUploadError('Could not attach that image')
    } finally {
      setUploading(false)
    }
  }

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: listOptions.queryKey })

  const add = useMutation(
    trpc.feedback.add.mutationOptions({
      onSuccess: () => {
        // Sent: the draft is no longer in flight, so it should not come back.
        updateDraft('')
        updateImages([])
        setUploadError(null)
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

  /** Every field is optional, so this submits whatever there is — including nothing. */
  const send = () =>
    add.mutate({
      resourceSlug: appSlug,
      body: draft.trim(),
      ...(images.length > 0
        ? { attachmentIds: images.map((image) => image.id) }
        : {}),
    })

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
                  <p
                    data-feedback-body=""
                    className="mt-0.5 whitespace-pre-wrap"
                  >
                    {item.body}
                  </p>
                ) : item.attachmentIds.length > 0 ? (
                  // The screenshot IS the detail — saying "no detail given" over a
                  // picture of the problem would read as the catalog ignoring it.
                  <p
                    data-feedback-body=""
                    className="text-muted-foreground mt-0.5 italic"
                  >
                    Screenshot only — no words added.
                  </p>
                ) : (
                  // A bare flag: no words, still a signal. Say so rather than
                  // rendering an empty row someone has to interpret.
                  <p
                    data-feedback-body=""
                    className="text-muted-foreground mt-0.5 italic"
                  >
                    Flagged as out of date — no detail given.
                  </p>
                )}

                <AttachmentStrip ids={item.attachmentIds} />

                {item.reviewerReply && (
                  <ReviewerReply reply={item.reviewerReply} />
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-muted-foreground text-xs">Nothing here yet.</p>
      )}

      {composerOpen ? (
        <div className="animate-in fade-in slide-in-from-top-2 mt-3 space-y-2 duration-200">
          <textarea
            autoFocus
            rows={3}
            className={cn(FIELD_CLASSES)}
            placeholder="What should change?"
            value={draft}
            onChange={(event) => updateDraft(event.target.value)}
            onKeyDown={(event) => {
              if (isSubmitChord(event)) {
                event.preventDefault()
                send()
              }
            }}
          />
          {images.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {images.map((image) => (
                <li key={image.id} className="relative">
                  <img
                    src={attachmentUrl(image.id)}
                    alt={image.name}
                    className="border-border h-16 w-24 rounded border object-cover"
                  />
                  <button
                    type="button"
                    aria-label={`Remove ${image.name}`}
                    onClick={() =>
                      updateImages(images.filter((i) => i.id !== image.id))
                    }
                    className="bg-background/90 text-muted-foreground hover:text-foreground absolute -top-1.5 -right-1.5 rounded-full border p-0.5 leading-none"
                  >
                    <X className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="sm"
              disabled={add.isPending || uploading}
              onClick={send}
            >
              {add.isPending ? 'Sending…' : 'Send'}
            </Button>

            {images.length < MAX_ATTACHMENTS && (
              <label className="text-muted-foreground hover:text-foreground cursor-pointer text-xs underline decoration-dotted underline-offset-2">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  disabled={uploading}
                  onChange={(event) => {
                    void attach(event.target.files)
                    // Cleared so picking the SAME file again still fires a change.
                    event.target.value = ''
                  }}
                />
                {uploading ? 'Attaching…' : 'Attach a screenshot'}
              </label>
            )}

            <span className="text-muted-foreground text-xs">
              Posted under a nickname. You can edit it for an hour, or withdraw
              it until someone answers.
            </span>
          </div>

          {uploadError && (
            <p className="text-destructive text-xs">{uploadError}</p>
          )}
        </div>
      ) : null}

      {/* Outside the composer: a failed list query leaves nothing to collapse into. */}
      {failure && (
        <p className="text-destructive mt-2 text-xs">{errorMessage(failure)}</p>
      )}
    </div>
  )
}
