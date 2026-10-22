import type { FeedSort, SortDir } from '@igstack/app-catalog-shared-core'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { useRef } from 'react'
import { cn } from '~/lib/utils'

export const SORT_OPTIONS: { value: FeedSort; label: string }[] = [
  { value: 'liked', label: 'Most liked' },
  { value: 'popular', label: 'Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'updated', label: 'Recently updated' },
]

const DIR_LABEL: Record<SortDir, string> = {
  desc: 'descending',
  asc: 'ascending',
}

/**
 * Segmented control above the feed. Choosing a sort starts it descending;
 * choosing the active one again flips the direction. Arrow keys move between
 * segments.
 */
export function FeedSortControl({
  sort,
  dir,
  onChange,
}: {
  sort: FeedSort
  dir: SortDir
  onChange: (sort: FeedSort, dir: SortDir) => void
}) {
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([])
  const label = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? sort

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (step === 0) return
    e.preventDefault()
    const next = (index + step + SORT_OPTIONS.length) % SORT_OPTIONS.length
    onChange(SORT_OPTIONS[next]!.value, 'desc')
    buttonsRef.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={`Sort by ${label}, ${DIR_LABEL[dir]}`}
      data-testid="feed-sort"
      className="inline-flex gap-0.5 rounded-[10px] bg-muted p-[3px] text-[13px] font-semibold"
    >
      {SORT_OPTIONS.map((option, index) => {
        const on = option.value === sort
        const Arrow = dir === 'desc' ? ArrowDown : ArrowUp
        return (
          <button
            key={option.value}
            ref={(el) => {
              buttonsRef.current[index] = el
            }}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={
              on ? `${option.label}, ${DIR_LABEL[dir]}` : option.label
            }
            tabIndex={on ? 0 : -1}
            onClick={() =>
              onChange(option.value, on && dir === 'desc' ? 'asc' : 'desc')
            }
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              'inline-flex items-center gap-1 rounded-lg px-3 py-[5px] transition-colors focus-visible:outline-2 focus-visible:outline-ring',
              on
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
            {on && <Arrow aria-hidden="true" className="size-3.5" />}
          </button>
        )
      })}
    </div>
  )
}
