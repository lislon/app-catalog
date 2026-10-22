import type {
  CommunityTag,
  CommunityTool,
} from '@igstack/app-catalog-shared-core'
import { X } from 'lucide-react'
import { cn } from '~/lib/utils'

/** A tag as it travels in `?tag=`: `topic:sandbox`, `app:order-service`. */
export function tagKey(tag: CommunityTag): string {
  return `${tag.kind}:${tag.value}`
}

/** An app tag reads as the app's name; a topic tag as its word. */
export function tagLabel(
  tag: CommunityTag,
  appNames: Record<string, string>,
): string {
  return tag.kind === 'app' ? (appNames[tag.value] ?? tag.value) : tag.value
}

const TOP_TAGS = 8

export function TagChip({
  label,
  active = false,
  count,
  onClick,
}: {
  label: string
  active?: boolean
  count?: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      data-testid="tool-tag"
      aria-pressed={active}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cn(
        'relative z-10 inline-flex h-6 items-center gap-1 rounded-full border px-2.5 text-xs font-semibold transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
        active
          ? 'border-primary/40 bg-accent text-accent-foreground'
          : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
      )}
    >
      {label}
      {count !== undefined && (
        <span className="font-bold text-muted-foreground/70">{count}</span>
      )}
      {active && <X aria-hidden="true" className="size-3" />}
    </button>
  )
}

/**
 * The most-used tags above the feed, as a way in for someone who does not know
 * what to search for. The chosen tag stays in the row even when it is not a top
 * one, so the filter can always be cleared where it is shown.
 */
export function TagRow({
  tools,
  activeTag,
  appNames,
  onChoose,
}: {
  tools: CommunityTool[]
  activeTag: string | undefined
  appNames: Record<string, string>
  onChoose: (tag: string | undefined) => void
}) {
  const counts = new Map<string, { tag: CommunityTag; count: number }>()
  for (const tool of tools) {
    for (const tag of tool.tags) {
      const key = tagKey(tag)
      const entry = counts.get(key) ?? { tag, count: 0 }
      entry.count += 1
      counts.set(key, entry)
    }
  }
  const ranked = [...counts.values()].sort(
    (a, b) =>
      b.count - a.count ||
      tagLabel(a.tag, appNames).localeCompare(tagLabel(b.tag, appNames)),
  )
  const shown = ranked.slice(0, TOP_TAGS)
  const active = activeTag ? counts.get(activeTag) : undefined
  if (active && !shown.includes(active)) shown.push(active)

  if (shown.length === 0) return null

  return (
    <div
      data-testid="tag-row"
      aria-label="Popular tags"
      role="group"
      className="mb-3 flex flex-wrap items-center gap-1.5"
    >
      {shown.map(({ tag, count }) => {
        const key = tagKey(tag)
        const on = key === activeTag
        return (
          <TagChip
            key={key}
            label={tagLabel(tag, appNames)}
            count={count}
            active={on}
            onClick={() => onChoose(on ? undefined : key)}
          />
        )
      })}
    </div>
  )
}
