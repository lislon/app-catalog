import type {
  CommunityTool,
  FeedSort,
  MatchField,
} from '@igstack/app-catalog-shared-core'
import { Link } from '@tanstack/react-router'
import {
  CornerDownLeft,
  Eye,
  Globe,
  MessageSquare,
  PanelRight,
} from 'lucide-react'
import { cn } from '~/lib/utils'
import { highlightTokens } from '~/util/highlightMatches'
import { exactDate, timeAgo } from '../timeAgo'
import { LifecycleBadge, UnreviewedBadge } from './LifecycleBadge'
import { LikeButton } from './LikeButton'
import { PinButton } from './PinButton'

export function screenshotUrl(id: string, size: number): string {
  return `/api/screenshots/${id}?size=${size}`
}

/** The tool's screenshot, cropped to its top-left, or a globe when there is none. */
export function ToolThumb({
  tool,
  size,
  className,
}: {
  tool: CommunityTool
  size: number
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden border border-border bg-muted text-muted-foreground',
        className,
      )}
    >
      {tool.screenshotId ? (
        <img
          src={screenshotUrl(tool.screenshotId, size)}
          alt=""
          loading="lazy"
          className="size-full object-cover object-left-top"
        />
      ) : (
        <Globe aria-hidden="true" className="size-1/4 min-w-4" />
      )}
    </div>
  )
}

const AVATAR_TONES = [
  'bg-orange-200',
  'bg-sky-200',
  'bg-lime-200',
  'bg-amber-200',
  'bg-rose-200',
  'bg-violet-200',
]

export function PersonAvatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('')
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex size-[22px] shrink-0 items-center justify-center rounded-full text-[9.5px] font-extrabold text-stone-700',
        AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length],
      )}
    >
      {initials}
    </span>
  )
}

const FIELD_LABELS: Record<MatchField, string> = {
  name: 'name',
  summary: 'summary',
  description: 'how to use',
  owner: 'author',
  address: 'address',
  tag: 'tag',
}

export interface FeedRowProps {
  tool: CommunityTool
  /** Shown in the ranked feed; search results have no rank. */
  rank?: number
  /**
   * Newest shows when it was added, Recently updated when the site changed;
   * every other sort the site's date, or when it was added if that is unknown.
   */
  sort: FeedSort
  tokens: string[]
  /** Set while searching: which fields the query hit. */
  matched?: MatchField[]
  selected?: boolean
  /**
   * Set while searching: the row is a row of the results grid, and this is the
   * id of its main cell, the one the search box points at.
   */
  optionId?: string
  pinned: boolean
  /** Its pin is being saved. */
  pinBusy?: boolean
  onTogglePin: () => void
  onToggleLike: () => void
}

/** The feed row's thumbnail: big enough to read the page title in its top left. */
export const ROW_THUMB = 'h-[150px] w-[240px] rounded-[10px]'

/** The Details panel's width, reserved at rest so nothing moves when it shows. */
const PANEL = 'w-[120px]'

/**
 * One tool in the feed or the search results. Everything left of the end
 * panel (rank, picture, name, summary, meta) is one link that opens the
 * site; the 120 px panel opens the card. The star sits in the meta
 * line as its own target, above that link.
 */
export function FeedRow({
  tool,
  rank,
  sort,
  tokens,
  matched,
  selected = false,
  optionId,
  pinned,
  pinBusy,
  onTogglePin,
  onToggleLike,
}: FeedRowProps) {
  const archived = tool.lifecycle.state === 'archived'
  const cell = optionId ? 'gridcell' : undefined
  const owners = tool.owners.map((o) => o.name).join(', ')
  const siteUpdatedAt = sort !== 'newest' ? tool.siteUpdatedAt : null
  const dated = siteUpdatedAt
    ? { label: 'Updated', at: siteUpdatedAt }
    : sort !== 'updated'
      ? { label: 'Added', at: tool.createdAt }
      : null

  return (
    <div
      data-testid="feed-row"
      data-slug={tool.slug}
      data-selected={selected || undefined}
      role={optionId ? 'row' : undefined}
      className={cn(
        'group/row relative flex min-h-[176px] items-center overflow-hidden rounded-[14px] border bg-card transition-[border-color,box-shadow]',
        selected
          ? 'border-primary ring-[3px] ring-primary/20'
          : 'border-border hover:border-primary/35 hover:shadow-sm has-[:focus-visible]:border-primary/35',
        archived && 'opacity-55',
      )}
    >
      {/* Two cells while searching: the site, and the card. A grid rather
          than a listbox, because an option's content is presentational and
          would hide the link and the star. */}
      <div
        id={optionId}
        role={cell}
        aria-selected={optionId ? selected : undefined}
        className="flex min-w-0 flex-1 items-center gap-4 self-stretch py-3 pl-3"
      >
        {rank !== undefined && (
          <span className="w-[26px] shrink-0 text-center font-serif text-[22px] font-semibold text-muted-foreground/70">
            {rank}
          </span>
        )}
        <ToolThumb tool={tool} size={512} className={ROW_THUMB} />
        <div className="min-w-0 flex-1 self-start pt-5 pr-6 pb-[52px]">
          <div className="flex items-center gap-2.5 text-[15.5px] font-extrabold">
            <a
              href={tool.url}
              data-site
              data-testid="feed-row-name"
              aria-label={`${tool.name}, opens ${tool.host}`}
              className={cn(
                'truncate decoration-1 underline-offset-[3px] after:absolute after:inset-y-0 after:left-0 after:right-[120px] after:z-[1] after:rounded-l-[13px] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-[3px] focus-visible:after:outline-ring',
                'group-hover/row:underline group-has-[[data-details]:hover]/row:no-underline',
                archived && 'text-muted-foreground',
              )}
            >
              {highlightTokens(tool.name, tokens)}
            </a>
            {selected && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11.5px] font-bold text-primary">
                <CornerDownLeft aria-hidden="true" className="size-3" />
                Enter opens site
              </span>
            )}
            <LifecycleBadge lifecycle={tool.lifecycle} />
            {!tool.reviewed && <UnreviewedBadge />}
          </div>
          {tool.summary && (
            <div className="mt-1 line-clamp-2 text-foreground/75">
              {highlightTokens(tool.summary, tokens)}
            </div>
          )}
          {matched && matched.length > 0 && (
            <div
              data-testid="match-reason"
              className="mt-1 text-xs font-semibold text-muted-foreground"
            >
              Matched: {matched.map((f) => FIELD_LABELS[f]).join(', ')}
            </div>
          )}
        </div>
        {/* Meta on the left, the date on the right, flush to the panel. A
            long author list gives way first. Clicks fall through to the row
            link, except on star and like. */}
        <div
          className={cn(
            'pointer-events-none absolute right-[120px] bottom-0 z-[2] flex h-12 items-center gap-4',
            rank !== undefined ? 'left-[310px]' : 'left-[268px]',
          )}
        >
          <div className="flex min-w-0 items-center gap-1.5 text-[13px] font-semibold whitespace-nowrap text-foreground/75 [&>*]:shrink-0">
            {tool.owners[0] && <PersonAvatar name={tool.owners[0].name} />}
            <span
              data-testid="feed-row-owner"
              className="mr-1 min-w-0 !shrink truncate"
            >
              {highlightTokens(owners, tokens)}
            </span>
            <span className="pointer-events-auto -mr-1 flex items-center">
              <PinButton
                small
                pinned={pinned}
                busy={pinBusy}
                name={tool.name}
                onToggle={onTogglePin}
              />
              <LikeButton tool={tool} onToggle={onToggleLike} />
            </span>
            <span
              data-testid="feed-row-views"
              className="inline-flex items-center gap-1 text-muted-foreground"
            >
              <Eye aria-hidden="true" className="size-[15px]" />
              {tool.views30d}
              <span className="sr-only"> views this month</span>
            </span>
            {tool.comments > 0 && (
              <span
                data-testid="feed-row-comments"
                className="inline-flex items-center gap-1 text-muted-foreground"
              >
                <MessageSquare aria-hidden="true" className="size-[15px]" />
                {tool.comments}
                <span className="sr-only">
                  {tool.comments === 1 ? ' comment' : ' comments'}
                </span>
              </span>
            )}
          </div>
          {dated && (
            <span
              data-testid="feed-row-date"
              title={exactDate(dated.at)}
              className="pointer-events-auto ml-auto shrink-0 pr-4 text-[13px] font-semibold whitespace-nowrap text-muted-foreground"
            >
              {dated.label} {timeAgo(dated.at)}
            </span>
          )}
        </div>
      </div>
      <div role={cell} className="flex self-stretch">
        <Link
          to="/community/$slug"
          params={{ slug: tool.slug }}
          search={(prev) => prev}
          data-details
          aria-label={`Details for ${tool.name}`}
          className={cn(
            PANEL,
            'relative z-[2] flex flex-none flex-col items-center justify-center gap-1.5 border-l border-border/55 text-[13.5px] font-extrabold text-muted-foreground transition-colors',
            'group-hover/row:border-border group-hover/row:bg-primary/[0.025] group-has-[:focus-visible]/row:bg-primary/[0.025]',
            'hover:!border-primary/30 hover:!bg-primary/12 hover:text-foreground',
            'focus-visible:rounded-r-[13px] focus-visible:!bg-primary/12 focus-visible:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-[3px] focus-visible:outline-ring',
          )}
        >
          {/* Shown on hover or focus; always where nothing hovers. */}
          <span className="flex flex-col items-center gap-1.5 opacity-0 transition-opacity group-hover/row:opacity-100 group-has-[:focus-visible]/row:opacity-100 [@media(hover:none)]:opacity-100">
            <PanelRight aria-hidden="true" className="size-[18px]" />
            <span>Details</span>
          </span>
        </Link>
      </div>
    </div>
  )
}
