import type { FeedWindow } from '@igstack/app-catalog-shared-core'
import { useRef } from 'react'
import { cn } from '~/lib/utils'

const OPTIONS: { value: FeedWindow; label: string }[] = [
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All time' },
  { value: 'newest', label: 'Newest' },
]

/** Segmented control above the feed; arrow keys move between segments. */
export function FeedWindowToggle({
  value,
  onChange,
}: {
  value: FeedWindow
  onChange: (value: FeedWindow) => void
}) {
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([])

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (step === 0) return
    e.preventDefault()
    const next = (index + step + OPTIONS.length) % OPTIONS.length
    onChange(OPTIONS[next]!.value)
    buttonsRef.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label="Rank by"
      data-testid="feed-window-toggle"
      className="inline-flex gap-0.5 rounded-[10px] bg-muted p-[3px] text-[13px] font-semibold"
    >
      {OPTIONS.map((option, index) => {
        const on = option.value === value
        return (
          <button
            key={option.value}
            ref={(el) => {
              buttonsRef.current[index] = el
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              'rounded-lg px-3 py-[5px] transition-colors focus-visible:outline-2 focus-visible:outline-ring',
              on
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
