import type {
  CommunityTool,
  FeedSort,
  MatchField,
} from '@igstack/app-catalog-shared-core'
import { Link } from '@tanstack/react-router'
import { CornerDownLeft, ExternalLink, Globe } from 'lucide-react'
import { cn } from '~/lib/utils'
import { highlightTokens } from '~/util/highlightMatches'
import { timeAgo } from '../timeAgo'
import { LifecycleBadge, UnreviewedBadge } from './LifecycleBadge'
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
  /** A date sort shows its date on the row. */
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
}

/** The feed row's thumbnail: big enough to read the page title in its top left. */
export const ROW_THUMB = 'h-[150px] w-[240px] rounded-[10px]'

/**
 * One tool in the feed or the search results. The name links to the card and
 * stretches over the whole row, so a click anywhere opens it; Details | Open,
 * the star and the tag chips sit above that link.
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
}: FeedRowProps) {
  const archived = tool.lifecycle.state === 'archived'
  const cell = optionId ? 'gridcell' : undefined
  const owners = tool.owners.map((o) => o.name).join(', ')
  const opens = tool.views30d
  const dated =
    sort === 'newest'
      ? `Added ${timeAgo(tool.createdAt)}`
      : sort === 'updated' && tool.siteUpdatedAt
        ? `Updated ${timeAgo(tool.siteUpdatedAt)}`
        : null

  return (
    <div
      data-testid="feed-row"
      data-slug={tool.slug}
      data-selected={selected || undefined}
      role={optionId ? 'row' : undefined}
      className={cn(
        'group relative flex items-center gap-4 rounded-[14px] border bg-card py-3 pr-3.5 pl-3 transition-[border-color,box-shadow]',
        selected
          ? 'border-primary ring-[3px] ring-primary/20'
          : 'border-border hover:border-primary/40 hover:shadow-sm',
        archived && 'opacity-55',
      )}
    >
      {/* Two cells while searching: what the tool is, and what can be done
          with it. A grid rather than a listbox, because an option's content
          is presentational and would hide the link, the tags and the star. */}
      <div
        id={optionId}
        role={cell}
        aria-selected={optionId ? selected : undefined}
        className="flex min-w-0 flex-1 items-center gap-4"
      >
        {rank !== undefined && (
          <span className="w-[26px] shrink-0 text-center font-serif text-[22px] font-semibold text-muted-foreground/70">
            {rank}
          </span>
        )}
        <ToolThumb tool={tool} size={512} className={ROW_THUMB} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 text-[15.5px] font-extrabold">
            <Link
              to="/community/$slug"
              params={{ slug: tool.slug }}
              search={(prev) => prev}
              data-testid="feed-row-name"
              className={cn(
                'truncate after:absolute after:inset-0 after:rounded-[14px] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring',
                archived && 'text-muted-foreground',
              )}
            >
              {highlightTokens(tool.name, tokens)}
            </Link>
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
          {/* Tags are on the card and in the tag row above the feed; here
            they wrapped unevenly. A tag search still says it matched one. */}
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 overflow-hidden text-[13px] font-semibold whitespace-nowrap text-foreground/75">
            <span className="flex min-w-0 flex-1 basis-40 items-center gap-1.5">
              {tool.owners[0] && <PersonAvatar name={tool.owners[0].name} />}
              <span data-testid="feed-row-owner" className="min-w-0 truncate">
                {highlightTokens(owners, tokens)}
              </span>
              {dated && (
                <span
                  data-testid="feed-row-date"
                  className="shrink-0 font-normal text-muted-foreground"
                >
                  · {dated}
                </span>
              )}
            </span>
          </div>
          {matched && matched.length > 0 && (
            <div
              data-testid="match-reason"
              className="mt-1 text-xs font-semibold text-muted-foreground"
            >
              Matched: {matched.map((f) => FIELD_LABELS[f]).join(', ')}
            </div>
          )}
        </div>
      </div>
      <div role={cell} className="flex shrink-0 items-center gap-4">
        {/* One button, two doors: the card, or straight to the site. */}
        <span
          data-testid="feed-row-actions"
          className="relative z-10 inline-flex h-[34px] shrink-0 overflow-hidden rounded-[9px] border border-border bg-card text-[13px] font-bold"
        >
          <Link
            to="/community/$slug"
            params={{ slug: tool.slug }}
            search={(prev) => prev}
            aria-label={`Details for ${tool.name}`}
            className="inline-flex items-center px-3 hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          >
            Details
          </Link>
          <a
            href={tool.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${tool.name} in a new tab`}
            className={cn(
              'inline-flex items-center gap-1.5 border-l px-3 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
              selected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border hover:bg-accent',
            )}
          >
            <ExternalLink aria-hidden="true" className="size-3.5" />
            Open
          </a>
        </span>
        <PinButton
          pinned={pinned}
          busy={pinBusy}
          name={tool.name}
          onToggle={onTogglePin}
        />
        <div className="w-16 shrink-0 rounded-[10px] border border-border bg-muted pt-1.5 pb-[5px] text-center">
          <b className="block font-serif text-lg leading-tight font-semibold">
            {opens}
          </b>
          <span className="text-[11px] font-semibold text-muted-foreground">
            opens
          </span>
        </div>
      </div>
    </div>
  )
}
