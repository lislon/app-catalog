import type {
  CommunityTool,
  FeedWindow,
  MatchField,
} from '@igstack/app-catalog-shared-core'
import { Link } from '@tanstack/react-router'
import { CornerDownLeft, ExternalLink, Globe } from 'lucide-react'
import { cn } from '~/lib/utils'
import { highlightTokens } from '~/util/highlightMatches'
import { LifecycleBadge, UnreviewedBadge } from './LifecycleBadge'
import { PinButton } from './PinButton'
import { TagChip, tagKey, tagLabel } from './TagRow'

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

const ROW_TAGS = 2

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
  feedWindow: FeedWindow
  tokens: string[]
  /** Set while searching: which fields the query hit. */
  matched?: MatchField[]
  selected?: boolean
  /** Set while searching: the row is an option of the results listbox. */
  optionId?: string
  pinned: boolean
  appNames: Record<string, string>
  activeTag: string | undefined
  onTogglePin: () => void
  onChooseTag: (tag: string | undefined) => void
}

/**
 * One tool in the feed or the search results. The name links to the card and
 * stretches over the whole row, so a click anywhere opens it; Open, the star
 * and the tag chips sit above that link.
 */
export function FeedRow({
  tool,
  rank,
  feedWindow,
  tokens,
  matched,
  selected = false,
  optionId,
  pinned,
  appNames,
  activeTag,
  onTogglePin,
  onChooseTag,
}: FeedRowProps) {
  const archived = tool.lifecycle.state === 'archived'
  const owners = tool.owners.map((o) => o.name).join(', ')
  const opens = feedWindow === 'all' ? tool.viewsAll : tool.views30d
  // Two chips fit beside the owner and host; the rest fold into "+N". The
  // chosen tag always shows, so a filtered feed says why each row is in it.
  const tags = [...tool.tags].sort(
    (a, b) => Number(tagKey(b) === activeTag) - Number(tagKey(a) === activeTag),
  )
  const shownTags = tags.slice(0, ROW_TAGS)
  const hiddenTags = tags.slice(ROW_TAGS)

  return (
    <div
      data-testid="feed-row"
      data-slug={tool.slug}
      data-selected={selected || undefined}
      id={optionId}
      role={optionId ? 'option' : undefined}
      aria-selected={optionId ? selected : undefined}
      className={cn(
        'group relative flex items-center gap-4 rounded-[14px] border bg-card py-3 pr-3.5 pl-3 transition-[border-color,box-shadow]',
        selected
          ? 'border-primary ring-[3px] ring-primary/20'
          : 'border-border hover:border-primary/40 hover:shadow-sm',
        archived && 'opacity-55',
      )}
    >
      {rank !== undefined && (
        <span className="w-[26px] shrink-0 text-center font-serif text-[22px] font-semibold text-muted-foreground/70">
          {rank}
        </span>
      )}
      <ToolThumb
        tool={tool}
        size={512}
        className="aspect-[16/10] w-32 rounded-[10px]"
      />
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
          <div className="mt-0.5 truncate text-foreground/75">
            {highlightTokens(tool.summary, tokens)}
          </div>
        )}
        {/* Who and where on one line; the tags join it while they fit and
            wrap under it when the row is narrow. Nothing leaves the row. */}
        <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 overflow-hidden text-[13px] font-semibold whitespace-nowrap text-foreground/75">
          <span className="flex min-w-0 flex-1 basis-40 items-center gap-1.5">
            {tool.owners[0] && (
              <>
                <PersonAvatar name={tool.owners[0].name} />
                <span
                  data-testid="feed-row-owner"
                  className="max-w-[60%] shrink-0 truncate"
                >
                  {highlightTokens(owners, tokens)}
                </span>
                <span className="text-muted-foreground">·</span>
              </>
            )}
            <span className="min-w-0 truncate font-mono text-xs font-normal text-muted-foreground">
              {highlightTokens(tool.host, tokens)}
            </span>
          </span>
          {tool.tags.length > 0 && (
            <span className="flex shrink-0 items-center gap-1.5">
              {shownTags.map((tag) => {
                const key = tagKey(tag)
                return (
                  <TagChip
                    key={key}
                    label={tagLabel(tag, appNames)}
                    active={key === activeTag}
                    onClick={() =>
                      onChooseTag(key === activeTag ? undefined : key)
                    }
                  />
                )
              })}
              {hiddenTags.length > 0 && (
                <span
                  title={hiddenTags
                    .map((t) => tagLabel(t, appNames))
                    .join(', ')}
                  className="rounded-full border border-border px-2 text-xs leading-[22px] font-semibold text-muted-foreground"
                >
                  +{hiddenTags.length}
                </span>
              )}
            </span>
          )}
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
      <a
        href={tool.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'relative z-10 inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-[9px] border px-3 text-[13px] font-bold transition-opacity',
          'focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring',
          selected
            ? 'border-primary bg-primary text-primary-foreground opacity-100'
            : 'border-border bg-card opacity-0 group-hover:opacity-100',
        )}
      >
        <ExternalLink aria-hidden="true" className="size-3.5" />
        Open
      </a>
      <PinButton pinned={pinned} name={tool.name} onToggle={onTogglePin} />
      <div className="w-16 shrink-0 rounded-[10px] border border-border bg-muted pt-1.5 pb-[5px] text-center">
        <b className="block font-serif text-lg leading-tight font-semibold">
          {opens}
        </b>
        <span className="text-[11px] font-semibold text-muted-foreground">
          opens
        </span>
      </div>
    </div>
  )
}
