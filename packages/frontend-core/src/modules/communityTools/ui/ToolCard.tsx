import type { Claim } from '@igstack/app-catalog-backend-core'
import type { CommunityTool } from '@igstack/app-catalog-shared-core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  Pencil,
} from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useTRPC } from '~/api/infra/trpc'
import {
  DIALOG_ROUND_BUTTON,
  DetailDialogShell,
} from '~/modules/appCatalog/ui/catalog/DetailDialogShell'
import { MarkdownText } from '~/modules/appCatalog/ui/components/MarkdownText'
import { CommentsFeed } from '~/modules/appCatalog/ui/detail/CommentsFeed'
import { CommentsHelp } from '~/modules/appCatalog/ui/detail/CommentsHelp'
import { CommunityInput } from '~/modules/appCatalog/ui/detail/CommunityInput'
import type { CommunityInputHandle } from '~/modules/appCatalog/ui/detail/CommunityInput'
import { cn } from '~/lib/utils'
import { useAuth } from '~/modules/auth'
import { Skeleton } from '~/ui/skeleton'
import { CardScreenshot, formatCardDate } from './CardScreenshot'
import { CardTitleBlock } from './CardTitleBlock'
import { PersonAvatar } from './FeedRow'
import { exactDate, timeAgo } from '../timeAgo'
import { useTimeUp } from '../useTimeUp'
import { PinButton } from './PinButton'
import { TagChip, tagKey, tagLabel } from './TagRow'
import { ArchiveConfirm, GHOST_BUTTON, ToolFormDialog } from './ToolFormDialog'

const KBD =
  'rounded-[5px] border border-b-2 border-border bg-card px-1.5 py-px text-[11px] font-semibold text-muted-foreground'

const SECTION = 'mt-6 border-t border-border pt-[22px]'

const LABEL =
  'text-[11.5px] font-bold tracking-wider text-muted-foreground uppercase'

const NO_CLAIMS: Claim[] = []

const DAY_MS = 24 * 60 * 60 * 1000

/** How often a card whose first screenshot is on its way asks again. */
const CAPTURE_POLL_MS = 5000

/** How long one open card waits for a first screenshot before it stops asking. */
const CAPTURE_WAIT_MS = 2 * 60 * 1000

export interface ToolCardProps {
  slug: string
  /** The list the card was opened from, in its order: ←/→ step through it. */
  siblings: string[]
  onClose: () => void
  onNavigate: (slug: string) => void
  pinned: boolean
  /** Its pin is being saved. */
  pinBusy?: boolean
  onTogglePin: (tool: CommunityTool) => void
  /** Display names of official apps by slug, for app tags. */
  appNames: Record<string, string>
  /** A tag chip on the card: close it and filter the feed to that tag. */
  onChooseTag: (tag: string) => void
}

/** Typing belongs to the field: the card's keys stay out of it. */
function isTyping(target: HTMLElement): boolean {
  return (
    target.isContentEditable ||
    target.closest('input, textarea, select') !== null
  )
}

/**
 * A community tool over the Community page, in the official card's shell: no
 * tabs, one scroll. Title and screenshot to recognise it, how to use it, who
 * to ask, and the comments.
 */
export function ToolCard({
  slug,
  siblings,
  onClose,
  onNavigate,
  pinned,
  pinBusy,
  onTogglePin,
  appNames,
  onChooseTag,
}: ToolCardProps) {
  const { user } = useAuth()
  const isAdmin = user?.isAdmin === true
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  // The feed already holds every tool, so the card paints at once from it
  // and the tool's own query only refreshes it.
  const list = useQuery(trpc.communityTools.list.queryOptions())
  const fromList = list.data?.find((t) => t.slug === slug)
  // Whatever the server says, an open card stops waiting after a while: a
  // capture that never reports back must not keep it asking forever.
  const gaveUpOnCapture = useTimeUp(slug, CAPTURE_WAIT_MS)
  const get = useQuery({
    ...trpc.communityTools.get.queryOptions({ slug }),
    placeholderData: fromList,
    // Until the first visit lands, keep asking, so the screenshot replaces
    // the placeholder without a reload.
    refetchInterval: (query) =>
      query.state.data?.capturePending && !gaveUpOnCapture
        ? CAPTURE_POLL_MS
        : false,
  })
  const tool = get.data

  // One view per open. The ref keeps StrictMode's second effect from counting
  // twice; stepping to another tool is another open.
  const [counts, setCounts] = useState<{
    slug: string
    views30d: number
    viewsAll: number
  } | null>(null)
  // The hook's own onSuccess, not one passed to `mutate`: StrictMode's
  // remount detaches the observer a `mutate` callback hangs on, so that one
  // never fires and the count stayed one short.
  const { mutate: recordView } = useMutation(
    trpc.communityTools.recordView.mutationOptions({
      onSuccess: (c, { slug: viewed }) => {
        setCounts({ slug: viewed, ...c })
      },
    }),
  )
  const recordedForRef = useRef<string | null>(null)
  useEffect(() => {
    if (recordedForRef.current === slug) return
    recordedForRef.current = slug
    recordView({ slug })
  }, [slug, recordView])
  const views = counts?.slug === slug ? counts : tool

  const [editing, setEditing] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const refreshTools = () =>
    queryClient.invalidateQueries({
      queryKey: trpc.communityTools.pathKey(),
    })
  const approve = useMutation(
    trpc.communityTools.approve.mutationOptions({ onSuccess: refreshTools }),
  )
  const archive = useMutation(
    trpc.communityTools.archive.mutationOptions({
      onSuccess: () => {
        setArchiving(false)
        return refreshTools()
      },
    }),
  )
  const adminError = approve.error ?? archive.error

  const commentsRef = useRef<CommunityInputHandle>(null)
  const commentsHeadingId = useId()
  const commentTarget = { communityToolSlug: slug }
  const comments = useQuery(trpc.feedback.list.queryOptions(commentTarget))
  const commentCount = comments.data?.items.length ?? 0

  const index = siblings.indexOf(slug)
  const prev = index > 0 ? siblings[index - 1] : undefined
  const next = index >= 0 ? siblings[index + 1] : undefined
  const nameOf = (s: string) => list.data?.find((t) => t.slug === s)?.name ?? s

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // React bubbles through portals: keys in the screenshot viewer are not ours.
    const target = e.target as HTMLElement
    if (!e.currentTarget.contains(target)) return
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
    if (isTyping(target)) return
    if (e.key === 'ArrowLeft' && prev) {
      e.preventDefault()
      onNavigate(prev)
    } else if (e.key === 'ArrowRight' && next) {
      e.preventDefault()
      onNavigate(next)
    } else if (e.key === 'Enter' && tool) {
      // A link or button answers Enter itself; the title block is the link
      // that opens the site.
      if (target.closest('a, button')) return
      e.preventDefault()
      window.location.assign(tool.url)
    }
  }

  const controls = index >= 0 && siblings.length > 1 && (
    <>
      <span className="flex items-center gap-1 text-[13px] font-semibold text-muted-foreground">
        <button
          type="button"
          aria-label={prev ? `Previous tool: ${nameOf(prev)}` : 'Previous tool'}
          disabled={!prev}
          onClick={() => prev && onNavigate(prev)}
          className={cn(DIALOG_ROUND_BUTTON, 'disabled:opacity-40')}
        >
          <ArrowLeft className="size-4" />
        </button>
        <span data-testid="card-position">
          {index + 1} of {siblings.length}
        </span>
        <button
          type="button"
          aria-label={next ? `Next tool: ${nameOf(next)}` : 'Next tool'}
          disabled={!next}
          onClick={() => next && onNavigate(next)}
          className={cn(DIALOG_ROUND_BUTTON, 'disabled:opacity-40')}
        >
          <ArrowRight className="size-4" />
        </button>
      </span>
      <i aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
    </>
  )

  return (
    <DetailDialogShell
      label={`${tool?.name ?? 'Community tool'} details`}
      shownKey={slug}
      maxWidthClass="max-w-[min(920px,94vw)]"
      focusSelector='[data-testid="card-title-block"]'
      controls={controls}
      testId="tool-card"
      onClose={onClose}
      onKeyDown={onKeyDown}
    >
      {tool ? (
        <>
          <div className="border-b border-border pb-[22px]">
            <div className="flex items-end justify-between gap-4 pr-44">
              <CardTitleBlock tool={tool} />
              <div className="-mr-40 flex shrink-0 items-center gap-2">
                {tool.canEdit && (
                  <button
                    type="button"
                    data-testid="card-edit-button"
                    onClick={() => setEditing(true)}
                    className={cn(GHOST_BUTTON, 'h-10 px-3.5 text-[13.5px]')}
                  >
                    <Pencil aria-hidden="true" className="size-4" />
                    Edit
                  </button>
                )}
                <PinButton
                  labelled
                  pinned={pinned}
                  busy={pinBusy}
                  name={tool.name}
                  onToggle={() => onTogglePin(tool)}
                />
              </div>
            </div>
            <div
              className={cn(
                tool.lifecycle.state === 'archived' && 'opacity-60',
              )}
            >
              {tool.summary && (
                <p className="mt-3.5 text-[15px] text-foreground/80">
                  {tool.summary}
                </p>
              )}
              {tool.tags.length > 0 && (
                <div
                  data-testid="card-tags"
                  className="mt-2.5 flex flex-wrap gap-1.5"
                >
                  {tool.tags.map((tag) => (
                    <TagChip
                      key={tagKey(tag)}
                      label={tagLabel(tag, appNames)}
                      onClick={() => onChooseTag(tagKey(tag))}
                    />
                  ))}
                </div>
              )}
              {views && (
                <p
                  data-testid="card-views"
                  className="mt-2.5 flex gap-[18px] text-[13px] font-semibold text-muted-foreground"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Eye aria-hidden="true" className="size-[15px]" />
                    <b className="text-foreground">
                      {views.views30d.toLocaleString('en-US')}
                    </b>{' '}
                    opens this month
                  </span>
                  <span>
                    <b className="text-foreground">
                      {views.viewsAll.toLocaleString('en-US')}
                    </b>{' '}
                    all time
                  </span>
                  {tool.siteUpdatedAt && (
                    <span
                      data-testid="card-site-updated"
                      title={exactDate(tool.siteUpdatedAt)}
                    >
                      Site updated {timeAgo(tool.siteUpdatedAt)}
                    </span>
                  )}
                </p>
              )}
              {/* Who to ask, up here with the facts: below the screenshot
                  it fell under the fold. */}
              <p
                data-testid="card-people"
                className="mt-2.5 flex flex-wrap items-center gap-x-[18px] gap-y-1.5 text-[13px] font-semibold text-muted-foreground"
              >
                {tool.owners.length > 0 && (
                  <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <span className={LABEL}>Owners</span>
                    {tool.owners.map((owner) => (
                      <span
                        key={owner.slug ?? `named:${owner.name}`}
                        className="inline-flex items-center gap-1.5 text-foreground"
                      >
                        <PersonAvatar name={owner.name} />
                        <span data-testid="card-owner">{owner.name}</span>
                      </span>
                    ))}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <span className={LABEL}>Added by</span>
                  <span className="text-foreground">{tool.addedBy.name}</span>
                  <span className="font-normal">
                    {formatCardDate(tool.createdAt)}
                  </span>
                </span>
              </p>
            </div>
            <LifecycleNote
              tool={tool}
              onTellOwner={() => commentsRef.current?.focus()}
            />
            {isAdmin && (
              <div
                data-testid="card-admin"
                className="mt-3.5 flex flex-col gap-2.5 rounded-[10px] border border-dashed border-border px-3 py-2.5"
              >
                {archiving ? (
                  <ArchiveConfirm
                    busy={archive.isPending}
                    onCancel={() => setArchiving(false)}
                    onArchive={(reason) => archive.mutate({ slug, reason })}
                  />
                ) : (
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="mr-auto text-[12.5px] font-bold tracking-wider text-muted-foreground uppercase">
                      Admin
                    </span>
                    {!tool.reviewed && (
                      <button
                        type="button"
                        disabled={approve.isPending}
                        aria-busy={approve.isPending || undefined}
                        onClick={() => approve.mutate({ slug })}
                        className={GHOST_BUTTON}
                      >
                        <Check aria-hidden="true" className="size-4" />
                        {approve.isPending ? 'Approving…' : 'Approve'}
                      </button>
                    )}
                    {tool.lifecycle.state !== 'archived' && (
                      <button
                        type="button"
                        onClick={() => setArchiving(true)}
                        className={GHOST_BUTTON}
                      >
                        <Archive aria-hidden="true" className="size-4" />
                        Archive
                      </button>
                    )}
                  </div>
                )}
                {adminError && (
                  <p
                    role="alert"
                    className="text-[13px] font-semibold text-destructive"
                  >
                    {adminError.message}
                  </p>
                )}
              </div>
            )}
          </div>

          <CardScreenshot
            tool={tool}
            capturing={tool.capturePending && !gaveUpOnCapture}
          />

          {tool.descriptionMd.trim() && (
            <section
              data-testid="card-how-to-use"
              className={cn(SECTION, 'text-[14.5px]')}
            >
              <h3 className="mb-2 font-serif text-[17px] font-semibold">
                How to use
              </h3>
              <div className="prose prose-sm dark:prose-invert max-w-[68ch]">
                <MarkdownText>{tool.descriptionMd}</MarkdownText>
              </div>
            </section>
          )}

          {/* The card's own order: what was said first, the input last. The
              official card's CommunitySection puts the input on top. */}
          <section data-testid="card-comments" className={SECTION}>
            <div className="comments-head">
              <h2 id={commentsHeadingId} className="behind-group__title">
                Comments
              </h2>
              {commentCount > 0 && (
                <span
                  data-testid="card-comment-count"
                  className="rounded-full bg-muted px-2 text-xs leading-5 font-bold text-muted-foreground"
                >
                  {commentCount}
                </span>
              )}
              <CommentsHelp appName={tool.name} />
            </div>
            <CommentsFeed
              target={commentTarget}
              claims={NO_CLAIMS}
              labelledBy={commentsHeadingId}
            />
            <div className="mt-3.5">
              <CommunityInput
                ref={commentsRef}
                target={commentTarget}
                appName={tool.name}
              />
            </div>
          </section>

          <p className="mt-[22px] flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] font-semibold text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <kbd className={KBD}>Esc</kbd> close
            </span>
            <span className="inline-flex items-center gap-1.5">
              <kbd className={KBD}>←</kbd>
              <kbd className={KBD}>→</kbd> previous / next tool
            </span>
            <span className="inline-flex items-center gap-1.5">
              <kbd className={KBD}>Enter</kbd> open site
              <span className="font-normal">
                (in the comment box, Enter sends)
              </span>
            </span>
          </p>
          {editing && (
            <ToolFormDialog
              mode="edit"
              initial={tool}
              onClose={() => setEditing(false)}
              onDone={() => setEditing(false)}
            />
          )}
        </>
      ) : get.isError ? (
        <p className="py-10 text-center text-muted-foreground">
          This tool is not listed any more.
        </p>
      ) : (
        <div aria-busy="true" className="flex flex-col gap-4">
          <Skeleton className="h-[72px] w-2/3 rounded-[14px]" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="aspect-[16/10] w-full rounded-[14px]" />
        </div>
      )}
    </DetailDialogShell>
  )
}

/** Why a tool that is not active is shown the way it is. */
function LifecycleNote({
  tool,
  onTellOwner,
}: {
  tool: CommunityTool
  onTellOwner: () => void
}) {
  const { lifecycle } = tool
  const [now] = useState(Date.now)
  if (lifecycle.state === 'not-working') {
    const since = new Date(now - lifecycle.days * DAY_MS).toISOString()
    return (
      <p
        data-testid="lifecycle-note"
        className="mt-3 rounded-[10px] bg-amber-50 px-3 py-[9px] text-[13.5px] text-amber-900 dark:bg-amber-950 dark:text-amber-200"
      >
        The daily check has not reached this site since{' '}
        {formatCardDate(since).replace(/ \d{4}$/, '')}. It may be down or moved.{' '}
        <button
          type="button"
          onClick={onTellOwner}
          className="font-bold underline underline-offset-2"
        >
          Tell the owner
        </button>
      </p>
    )
  }
  if (lifecycle.state === 'archived') {
    const on = formatCardDate(lifecycle.at)
    return (
      <p
        data-testid="lifecycle-note"
        className="mt-3 rounded-[10px] bg-muted px-3 py-[9px] text-[13.5px] text-muted-foreground"
      >
        {lifecycle.byName
          ? `Archived by ${lifecycle.byName} on ${on}${lifecycle.reason ? `: ${lifecycle.reason}` : ''}.`
          : `Archived automatically on ${on} after 30 days not working.`}{' '}
        Kept here so old links still land somewhere.
      </p>
    )
  }
  return null
}
