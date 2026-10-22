import type { ToolPreview } from '@igstack/app-catalog-backend-core'
import type {
  CommunityTag,
  CommunityTool,
} from '@igstack/app-catalog-shared-core'
import { TAG_VALUE_MAX, hostOf } from '@igstack/app-catalog-shared-core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  Camera,
  CheckCircle2,
  ImageOff,
  Loader2,
  X,
} from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useTRPC } from '~/api/infra/trpc'
import { cn } from '~/lib/utils'
import { useAppCatalogContext } from '~/modules/appCatalog/context/AppCatalogContext'
import { MarkdownText } from '~/modules/appCatalog/ui/components/MarkdownText'
import { useAuth } from '~/modules/auth'
import { useDismissable } from '~/modules/dismiss/DismissStack'
import { Dialog, DialogContent, DialogTitle } from '~/ui/dialog'
import { formatCardDate } from './CardScreenshot'
import { screenshotUrl } from './FeedRow'
import { FIELD_BAD, FIELD_BOX, OwnerPicker } from './OwnerPicker'
import { TagPicker } from './TagPicker'

/** How long the address must sit still before the site is read. */
const PREVIEW_DELAY_MS = 400

const NAME_MAX = 80
const SUMMARY_MAX = 160
const DESCRIPTION_MAX = 5000

export const GHOST_BUTTON =
  'inline-flex h-[34px] items-center gap-[7px] rounded-[10px] border border-border bg-card px-[11px] text-[13px] font-bold whitespace-nowrap hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50'

export const PRIMARY_BUTTON =
  'inline-flex h-[34px] items-center gap-2 rounded-[10px] bg-primary px-4 text-[13.5px] font-extrabold whitespace-nowrap text-primary-foreground shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50'

const LABEL = 'text-[13px] font-bold'
const HINT = 'text-[12.5px] text-muted-foreground'

type Field = 'name' | 'owners' | 'tags'

export interface ToolFormDialogProps {
  mode: 'add' | 'edit'
  /** The tool being edited. */
  initial?: CommunityTool
  /** What the visitor searched for: a first guess at the name. */
  prefillName?: string
  /** Published, saved or archived. */
  onDone: (slug: string) => void
  onClose: () => void
  /** The address is already listed, and they chose to look at that card. */
  onOpenCard?: (slug: string) => void
}

/** A field's error, next to it; the form points at the first one on submit. */
function FieldError({ id, children }: { id: string; children: string }) {
  return (
    <p
      id={id}
      role="alert"
      className="flex items-center gap-1.5 text-[12.5px] font-bold text-destructive"
    >
      <AlertCircle aria-hidden="true" className="size-3.5 shrink-0" />
      {children}
    </p>
  )
}

/**
 * Add a tool, or edit one: the same form. The address comes first; once it
 * sits still the backend reads the page, the title fills the name and a
 * screenshot preview shows. A host already listed is caught before anything
 * else is asked. Publish makes the tool live at once and puts it in the
 * review list.
 */
export function ToolFormDialog({
  mode,
  initial,
  prefillName,
  onDone,
  onClose,
  onOpenCard,
}: ToolFormDialogProps) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { persons, resources } = useAppCatalogContext()
  const list = useQuery(trpc.communityTools.list.queryOptions())
  const formId = useId()
  const ids = {
    url: `${formId}-url`,
    name: `${formId}-name`,
    summary: `${formId}-summary`,
    owners: `${formId}-owners`,
    tags: `${formId}-tags`,
    description: `${formId}-description`,
  }
  const errorId = (field: string) => `${field}-error`

  const [url, setUrl] = useState(initial?.url ?? '')
  const [name, setName] = useState(initial?.name ?? prefillName ?? '')
  // The page title fills the name only until the visitor writes their own.
  const [nameTouched, setNameTouched] = useState(mode === 'edit')
  // The same, for the debounced read below, without restarting its timer.
  const nameTouchedRef = useRef(nameTouched)
  const [summary, setSummary] = useState(initial?.summary ?? '')
  const [descriptionMd, setDescriptionMd] = useState(
    initial?.descriptionMd ?? '',
  )
  const [ownerSlugs, setOwnerSlugs] = useState<string[]>(() => {
    if (initial) return initial.owners.map((o) => o.slug)
    // The person adding it is the first owner, when the directory knows them.
    const email = user?.email?.toLowerCase()
    const me = email
      ? persons.find(
          (p) =>
            p.email?.toLowerCase() === email || p.slug.toLowerCase() === email,
        )
      : undefined
    return me ? [me.slug] : []
  })
  const [tags, setTags] = useState<CommunityTag[]>(initial?.tags ?? [])
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [archiving, setArchiving] = useState(false)

  // The address as it was when the visitor stopped typing, and what reading it gave.
  const [checked, setChecked] = useState(initial?.url ?? '')
  const [preview, setPreview] = useState<{
    url: string
    data: ToolPreview | null
  } | null>(null)
  const [addAnywayFor, setAddAnywayFor] = useState<string | null>(null)

  const previewMutation = useMutation(
    trpc.communityTools.preview.mutationOptions(),
  )
  const { mutateAsync: readSite } = previewMutation
  useEffect(() => {
    const address = url.trim()
    // Set once the address changes again: a slower answer for this one must
    // not overwrite the newer address's preview or name.
    let stale = false
    const timer = setTimeout(() => {
      setChecked(address)
      if (!needsPreviewFor(address, mode, initial?.url)) return
      readSite({ url: address }).then(
        (data) => {
          if (stale) return
          setPreview({ url: address, data })
          if (data.title && !nameTouchedRef.current) setName(data.title)
        },
        () => {
          if (!stale) setPreview({ url: address, data: null })
        },
      )
    }, PREVIEW_DELAY_MS)
    return () => {
      stale = true
      clearTimeout(timer)
    }
  }, [url, mode, initial?.url, readSite])

  const address = url.trim()
  const validAddress = hostOf(address) !== null
  const showBadAddress = checked !== '' && checked === address && !validAddress
  const reading =
    needsPreviewFor(address, mode, initial?.url) &&
    (checked !== address || preview?.url !== address)
  const current = preview?.url === address ? preview.data : null
  const duplicate =
    current?.duplicate && current.duplicate.slug !== initial?.slug
      ? current.duplicate
      : null
  // An official catalog app on the same host outranks a community duplicate.
  const officialApp = current?.officialApp ?? null
  const blockedByDuplicate =
    (officialApp !== null || duplicate !== null) && addAnywayFor !== address
  const showDetails =
    mode === 'edit' ||
    (validAddress && !reading && !blockedByDuplicate) ||
    (!validAddress && name.trim() !== '' && !showBadAddress)

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: trpc.communityTools.pathKey(),
    })
  const add = useMutation(
    trpc.communityTools.add.mutationOptions({ onSuccess: invalidate }),
  )
  const edit = useMutation(
    trpc.communityTools.edit.mutationOptions({ onSuccess: invalidate }),
  )
  const archive = useMutation(
    trpc.communityTools.archive.mutationOptions({ onSuccess: invalidate }),
  )
  const save = mode === 'add' ? add : edit
  const busy = save.isPending || archive.isPending

  const urlRef = useRef<HTMLInputElement>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    // Publish stays disabled until the address is one; Enter in a field
    // cannot submit past a disabled button either.
    if (busy || !validAddress) return
    const found: Partial<Record<Field, string>> = {}
    if (!name.trim()) found.name = 'Give it the name colleagues call it.'
    if (ownerSlugs.length === 0) {
      found.owners = 'Add at least one person to ask about it.'
    }
    setErrors(found)
    const first = (['name', 'owners'] as const).find((f) => found[f])
    if (first) {
      document.getElementById(ids[first])?.focus()
      return
    }
    const input = {
      url: address,
      name: name.trim(),
      summary: summary.trim(),
      descriptionMd,
      ownerSlugs,
      tags,
    }
    if (mode === 'add') {
      add.mutate(input, { onSuccess: (tool) => onDone(tool.slug) })
    } else if (initial) {
      edit.mutate(
        { ...input, slug: initial.slug },
        { onSuccess: (tool) => onDone(tool.slug) },
      )
    }
  }

  const contentRef = useRef<HTMLDivElement>(null)
  // On the dismiss stack, so Escape closes this form and not the card under
  // it; while it saves, Escape does nothing at all.
  useDismissable(contentRef, () => {
    if (!busy) onClose()
  })

  const officialApps = resources.filter((r) => !r.parentSlug)
  const knownTopics = [
    ...new Set(
      (list.data ?? []).flatMap((t) =>
        t.tags.filter((g) => g.kind === 'topic').map((g) => g.value),
      ),
    ),
  ].sort()

  const title = mode === 'add' ? 'Add a tool' : 'Edit tool'
  const serverError = save.error ?? archive.error

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose()
      }}
    >
      <DialogContent
        ref={contentRef}
        data-testid={mode === 'add' ? 'add-tool-dialog' : 'edit-tool-dialog'}
        aria-describedby={undefined}
        showCloseButton={false}
        // Top-anchored: the form grows downward as the site is read, so
        // nothing above the caret moves.
        className="top-[6vh] max-h-[88vh] translate-y-0 gap-0 overflow-y-auto p-0 sm:max-w-[680px]"
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          urlRef.current?.focus()
        }}
        // Typing is lost on a stray click; only Cancel, Close or Esc leave.
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          // An open suggestion list takes Escape for itself.
          const target = e.target as Element | null
          if (target?.closest('[aria-expanded="true"]')) e.preventDefault()
        }}
      >
        <form onSubmit={submit} noValidate aria-busy={busy || undefined}>
          <div className="flex items-center justify-between px-5 pt-4">
            <DialogTitle className="font-serif text-[19px] leading-tight font-semibold">
              {title}
            </DialogTitle>
            <button
              type="button"
              aria-label="Close"
              disabled={busy}
              onClick={onClose}
              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>

          <div className="flex flex-col gap-3.5 px-5 pt-4 pb-1.5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={ids.url} className={LABEL}>
                Site address
              </label>
              <div className={cn(FIELD_BOX, showBadAddress && FIELD_BAD)}>
                <input
                  ref={urlRef}
                  id={ids.url}
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  placeholder="Paste the link to the tool"
                  value={url}
                  disabled={busy}
                  aria-invalid={showBadAddress || undefined}
                  aria-describedby={
                    showBadAddress ? errorId(ids.url) : `${ids.url}-hint`
                  }
                  onChange={(e) => setUrl(e.target.value)}
                  className="h-10 min-w-0 flex-1 bg-transparent font-mono text-[13px] outline-none placeholder:font-sans placeholder:text-muted-foreground"
                />
                {validAddress && reading && (
                  <span
                    data-testid="reading-site"
                    className="inline-flex shrink-0 items-center gap-1.5 text-[12.5px] font-semibold text-muted-foreground"
                  >
                    <Loader2
                      aria-hidden="true"
                      className="size-3.5 animate-spin"
                    />
                    Reading the site…
                  </span>
                )}
                {validAddress &&
                  !reading &&
                  (current?.title || current?.screenshotDataUrl) && (
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-[12.5px] font-semibold text-green-700 dark:text-green-400">
                      <CheckCircle2 aria-hidden="true" className="size-3.5" />
                      Found
                    </span>
                  )}
              </div>
              {showBadAddress ? (
                <FieldError id={errorId(ids.url)}>
                  That is not a web address. Paste the full link, starting with
                  https://
                </FieldError>
              ) : (
                !validAddress &&
                !showDetails &&
                !blockedByDuplicate && (
                  <p id={`${ids.url}-hint`} className={HINT}>
                    Paste it first. The name and screenshot fill in from the
                    site.
                  </p>
                )
              )}
            </div>

            {validAddress && reading && <ReadingSkeleton />}

            {blockedByDuplicate && officialApp && (
              <div
                data-testid="official-app-warning"
                role="alert"
                className="flex gap-2.5 rounded-[10px] bg-amber-50 px-3.5 py-3 text-[13.5px] text-amber-900 dark:bg-amber-950 dark:text-amber-200"
              >
                <AlertTriangle
                  aria-hidden="true"
                  className="mt-px size-[18px] shrink-0"
                />
                <div>
                  <b>This is already in the catalog as {officialApp.name}.</b>
                  <div className="mt-2.5 flex items-center gap-3.5">
                    <Link
                      to="/app/$slug"
                      params={{ slug: officialApp.slug }}
                      className={GHOST_BUTTON}
                    >
                      Open {officialApp.name}
                    </Link>
                    <button
                      type="button"
                      className="font-bold underline underline-offset-2"
                      onClick={() => setAddAnywayFor(address)}
                    >
                      Add anyway
                    </button>
                  </div>
                </div>
              </div>
            )}

            {blockedByDuplicate && !officialApp && duplicate && (
              <div
                data-testid="duplicate-warning"
                role="alert"
                className="flex gap-2.5 rounded-[10px] bg-amber-50 px-3.5 py-3 text-[13.5px] text-amber-900 dark:bg-amber-950 dark:text-amber-200"
              >
                <AlertTriangle
                  aria-hidden="true"
                  className="mt-px size-[18px] shrink-0"
                />
                <div>
                  <b>This site is already here.</b> “{duplicate.name}” uses the
                  same address.
                  <div className="mt-2.5 flex items-center gap-3.5">
                    <button
                      type="button"
                      className={GHOST_BUTTON}
                      onClick={() => onOpenCard?.(duplicate.slug)}
                    >
                      Open that card
                    </button>
                    <button
                      type="button"
                      className="font-bold underline underline-offset-2"
                      onClick={() => setAddAnywayFor(address)}
                    >
                      Add anyway
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showDetails && (
              <>
                <div className="grid grid-cols-[minmax(0,1fr)_190px] items-start gap-4">
                  <div className="flex min-w-0 flex-col gap-3.5">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={ids.name} className={LABEL}>
                        Name
                      </label>
                      <div
                        className={cn(
                          FIELD_BOX,
                          !nameTouched &&
                            current?.title &&
                            name === current.title &&
                            'bg-amber-50/70 dark:bg-amber-950/40',
                          errors.name && FIELD_BAD,
                        )}
                      >
                        <input
                          id={ids.name}
                          type="text"
                          maxLength={NAME_MAX}
                          value={name}
                          disabled={busy}
                          aria-invalid={!!errors.name || undefined}
                          aria-describedby={
                            errors.name ? errorId(ids.name) : `${ids.name}-hint`
                          }
                          onChange={(e) => {
                            setName(e.target.value)
                            setNameTouched(true)
                            nameTouchedRef.current = true
                            setErrors((prev) => ({ ...prev, name: undefined }))
                          }}
                          className="h-10 min-w-0 flex-1 bg-transparent outline-none"
                        />
                      </div>
                      {errors.name ? (
                        <FieldError id={errorId(ids.name)}>
                          {errors.name}
                        </FieldError>
                      ) : (
                        current?.title &&
                        !nameTouched && (
                          <p id={`${ids.name}-hint`} className={HINT}>
                            From the page title. Change it if colleagues call it
                            something else.
                          </p>
                        )
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={ids.owners} className={LABEL}>
                        Owners
                      </label>
                      <OwnerPicker
                        id={ids.owners}
                        persons={persons}
                        value={ownerSlugs}
                        disabled={busy}
                        invalid={!!errors.owners}
                        describedBy={
                          errors.owners
                            ? errorId(ids.owners)
                            : `${ids.owners}-hint`
                        }
                        onChange={(slugs) => {
                          setOwnerSlugs(slugs)
                          setErrors((prev) => ({ ...prev, owners: undefined }))
                        }}
                      />
                      {errors.owners ? (
                        <FieldError id={errorId(ids.owners)}>
                          {errors.owners}
                        </FieldError>
                      ) : (
                        <p id={`${ids.owners}-hint`} className={HINT}>
                          Who to ask about it. You are added by default.
                        </p>
                      )}
                    </div>
                  </div>
                  <ShotPreview
                    preview={current}
                    initial={address === initial?.url ? initial : undefined}
                    validAddress={validAddress}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor={ids.summary} className={LABEL}>
                    Summary{' '}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </label>
                  <div className={FIELD_BOX}>
                    <input
                      id={ids.summary}
                      type="text"
                      maxLength={SUMMARY_MAX}
                      value={summary}
                      disabled={busy}
                      aria-describedby={`${ids.summary}-hint`}
                      onChange={(e) => setSummary(e.target.value)}
                      className="h-10 min-w-0 flex-1 bg-transparent outline-none"
                    />
                  </div>
                  <p id={`${ids.summary}-hint`} className={HINT}>
                    One line under the name, in the list and on the card.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor={ids.tags} className={LABEL}>
                    Tags{' '}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </label>
                  <TagPicker
                    id={ids.tags}
                    apps={officialApps}
                    knownTopics={knownTopics}
                    value={tags}
                    disabled={busy}
                    describedBy={
                      errors.tags ? errorId(ids.tags) : `${ids.tags}-hint`
                    }
                    onChange={(next) => {
                      setTags(next)
                      setErrors((prev) => ({ ...prev, tags: undefined }))
                    }}
                    onTooLong={() =>
                      setErrors((prev) => ({
                        ...prev,
                        tags: `A topic is at most ${TAG_VALUE_MAX} characters.`,
                      }))
                    }
                  />
                  {errors.tags ? (
                    <FieldError id={errorId(ids.tags)}>
                      {errors.tags}
                    </FieldError>
                  ) : (
                    <p id={`${ids.tags}-hint`} className={HINT}>
                      The app it is for, or a topic word. Press Enter to add a
                      new topic.
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor={ids.description} className={LABEL}>
                    How to use
                  </label>
                  <div className="overflow-hidden rounded-[10px] border border-border bg-card">
                    <div
                      role="tablist"
                      aria-label="Write or preview"
                      className="flex items-center gap-0.5 border-b border-border bg-muted p-1"
                    >
                      {(['write', 'preview'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          role="tab"
                          aria-selected={tab === t}
                          onClick={() => setTab(t)}
                          className={cn(
                            'rounded-[7px] px-3 py-1 text-[12.5px] font-bold text-muted-foreground',
                            tab === t && 'bg-card text-foreground shadow-sm',
                          )}
                        >
                          {t === 'write' ? 'Write' : 'Preview'}
                        </button>
                      ))}
                      <span className="ml-auto pr-2 text-[11.5px] text-muted-foreground">
                        Markdown
                      </span>
                    </div>
                    {/* Kept mounted while previewing, so the label and its draft stay. */}
                    <textarea
                      id={ids.description}
                      rows={6}
                      maxLength={DESCRIPTION_MAX}
                      value={descriptionMd}
                      disabled={busy}
                      hidden={tab !== 'write'}
                      aria-describedby={`${ids.description}-hint`}
                      onChange={(e) => setDescriptionMd(e.target.value)}
                      className="block w-full resize-y bg-transparent px-3 py-2.5 font-mono text-[12.5px] leading-relaxed outline-none"
                    />
                    {tab === 'preview' && (
                      <div
                        data-testid="description-preview"
                        role="tabpanel"
                        className="prose prose-sm dark:prose-invert min-h-24 max-w-none px-3.5 py-2.5"
                      >
                        {descriptionMd.trim() ? (
                          <MarkdownText>{descriptionMd}</MarkdownText>
                        ) : (
                          <p className="text-muted-foreground">
                            Nothing written yet.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <p id={`${ids.description}-hint`} className={HINT}>
                    Short steps work best. This is the text people read on the
                    card.
                  </p>
                </div>
              </>
            )}
          </div>

          {serverError && (
            <p
              role="alert"
              className="mx-5 mt-2 rounded-[10px] bg-destructive/10 px-3 py-2 text-[13px] font-semibold text-destructive"
            >
              {archive.error ? 'Could not archive it: ' : 'Could not save it: '}
              {serverError.message}
            </p>
          )}

          {archiving && initial ? (
            <div className="mt-2 border-t border-border px-5 pt-3 pb-4">
              <ArchiveConfirm
                busy={archive.isPending}
                onCancel={() => setArchiving(false)}
                onArchive={(reason) =>
                  archive.mutate(
                    { slug: initial.slug, reason },
                    { onSuccess: () => onDone(initial.slug) },
                  )
                }
              />
            </div>
          ) : (
            <div className="mt-2 flex items-center justify-end gap-2.5 border-t border-border px-5 pt-3 pb-4">
              {/* Already archived: nothing to archive, as on the card. */}
              {mode === 'edit' && initial?.lifecycle.state !== 'archived' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setArchiving(true)}
                  className="inline-flex items-center gap-1.5 text-[13px] font-bold text-destructive hover:underline disabled:opacity-50"
                >
                  <Archive aria-hidden="true" className="size-3.5" />
                  Archive this tool
                </button>
              )}
              <span
                className={cn(
                  'text-[12.5px] text-muted-foreground',
                  mode === 'add' ? 'mr-auto' : 'ml-auto',
                )}
              >
                {mode === 'add'
                  ? 'Goes live now and joins the review list.'
                  : 'Changes show on the card right away.'}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={onClose}
                className={GHOST_BUTTON}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!validAddress || reading || busy}
                aria-busy={save.isPending || undefined}
                className={PRIMARY_BUTTON}
              >
                {save.isPending && (
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                )}
                {mode === 'add'
                  ? save.isPending
                    ? 'Publishing…'
                    : 'Publish'
                  : save.isPending
                    ? 'Saving…'
                    : 'Save changes'}
              </button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}

function needsPreviewFor(
  address: string,
  mode: 'add' | 'edit',
  initialUrl: string | undefined,
): boolean {
  return hostOf(address) !== null && (mode === 'add' || address !== initialUrl)
}

/** While the site is read: where the name, owners and picture will be. */
function ReadingSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="grid grid-cols-[minmax(0,1fr)_190px] items-start gap-4"
    >
      <div className="flex flex-col gap-3.5">
        {['55%', '40%'].map((w, i) => (
          <div key={w} className="flex flex-col gap-1.5">
            <span className={LABEL}>{i === 0 ? 'Name' : 'Owners'}</span>
            <span className={cn(FIELD_BOX, 'pointer-events-none')}>
              <i
                className="block h-3 animate-pulse rounded-md bg-muted"
                style={{ width: w }}
              />
            </span>
          </div>
        ))}
      </div>
      <div className="mt-[22px] flex aspect-[16/11] flex-col items-center justify-center gap-1.5 rounded-[10px] border border-border bg-muted text-xs font-semibold text-muted-foreground">
        <Camera aria-hidden="true" className="size-5 animate-pulse" />
        Taking a screenshot…
      </div>
    </div>
  )
}

/** The picture the card will lead with, or why there will be none. */
function ShotPreview({
  preview,
  initial,
  validAddress,
}: {
  preview: ToolPreview | null
  /** The tool being edited, while its address is unchanged. */
  initial?: CommunityTool
  validAddress: boolean
}) {
  const box =
    'relative mt-[22px] flex aspect-[16/11] flex-col items-center justify-center gap-1.5 overflow-hidden rounded-[10px] border border-border bg-muted px-3 text-center text-xs font-semibold text-muted-foreground'
  const caption =
    'absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-md bg-white/90 px-[7px] py-0.5 text-[11px] font-bold text-muted-foreground dark:bg-black/70'

  if (preview?.screenshotDataUrl) {
    return (
      <div data-testid="shot-preview" className={box}>
        <img
          src={preview.screenshotDataUrl}
          alt="Screenshot preview of the site"
          className="absolute inset-0 size-full object-cover object-left-top"
        />
        <span className={caption}>
          <Camera aria-hidden="true" className="size-3" />
          Captured just now
        </span>
      </div>
    )
  }
  if (initial?.screenshotId) {
    return (
      <div data-testid="shot-preview" className={box}>
        <img
          src={screenshotUrl(initial.screenshotId, 640)}
          alt={`Screenshot of ${initial.name}`}
          className="absolute inset-0 size-full object-cover object-left-top"
        />
        {initial.capturedAt && (
          <span className={caption}>
            <Camera aria-hidden="true" className="size-3" />
            Captured {formatCardDate(initial.capturedAt)}
          </span>
        )}
      </div>
    )
  }
  return (
    <div data-testid="shot-preview" data-state="none" className={box}>
      <ImageOff aria-hidden="true" className="size-5" />
      {preview && !preview.captureAllowed
        ? "This site's address is outside the hosts we take screenshots of, so it will be listed without a picture."
        : validAddress
          ? 'No preview. The site may need a login, or it did not load.'
          : 'The screenshot shows here once the address is in.'}
    </div>
  )
}

/**
 * Archiving asks why, in one step: the reason is what colleagues read on the
 * card, and what the review list records.
 */
export function ArchiveConfirm({
  busy,
  onArchive,
  onCancel,
}: {
  busy: boolean
  onArchive: (reason: string) => void
  onCancel: () => void
}) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [reason, setReason] = useState('')
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const confirm = () => {
    if (!reason.trim()) {
      setMissing(true)
      inputRef.current?.focus()
      return
    }
    onArchive(reason.trim())
  }

  return (
    <div data-testid="archive-confirm" className="flex flex-col gap-1.5">
      <label htmlFor={id} className={LABEL}>
        Why archive it?
      </label>
      <div className="flex items-center gap-2.5">
        <div className={cn(FIELD_BOX, 'flex-1', missing && FIELD_BAD)}>
          <input
            ref={inputRef}
            id={id}
            type="text"
            maxLength={500}
            value={reason}
            disabled={busy}
            aria-invalid={missing || undefined}
            aria-describedby={missing ? `${id}-error` : `${id}-hint`}
            onChange={(e) => {
              setReason(e.target.value)
              setMissing(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                confirm()
              }
            }}
            className="h-10 min-w-0 flex-1 bg-transparent outline-none"
          />
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className={GHOST_BUTTON}
        >
          Keep it
        </button>
        <button
          type="button"
          disabled={busy}
          aria-busy={busy || undefined}
          onClick={confirm}
          className={cn(PRIMARY_BUTTON, 'bg-destructive text-white')}
        >
          {busy && (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          )}
          {busy ? 'Archiving…' : 'Archive'}
        </button>
      </div>
      {missing ? (
        <FieldError id={`${id}-error`}>
          Say why, so colleagues know what happened to it.
        </FieldError>
      ) : (
        <p id={`${id}-hint`} className={HINT}>
          Colleagues read this on the card. It stays reachable by its link.
        </p>
      )}
    </div>
  )
}
