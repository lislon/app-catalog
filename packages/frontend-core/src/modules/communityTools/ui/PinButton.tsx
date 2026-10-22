import { Loader2, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '~/lib/utils'

/** A save quicker than this shows no spinner at all: the star already moved. */
const BUSY_AFTER_MS = 400

/**
 * The star on rows, tiles and the card: pins the tool to My tools, or takes it
 * off. The card's is `labelled`, a bordered button that says Pin or Pinned.
 */
export function PinButton({
  pinned,
  name,
  onToggle,
  labelled = false,
  busy = false,
}: {
  pinned: boolean
  name: string
  onToggle: () => void
  labelled?: boolean
  /** The pin is being saved; the star shows the state it will have. */
  busy?: boolean
}) {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    if (!busy) return
    const timer = setTimeout(() => setSlow(true), BUSY_AFTER_MS)
    return () => {
      clearTimeout(timer)
      setSlow(false)
    }
  }, [busy])
  const showBusy = busy && slow

  return (
    <button
      type="button"
      data-testid="pin-button"
      aria-pressed={pinned}
      aria-busy={showBusy || undefined}
      aria-label={pinned ? `Unpin ${name}` : `Pin ${name} to My tools`}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      className={cn(
        'relative z-10 inline-flex shrink-0 items-center justify-center rounded-[9px] transition-colors',
        'hover:bg-accent hover:text-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        labelled
          ? cn(
              'h-10 gap-[7px] rounded-[10px] border px-3.5 text-[13.5px] font-bold whitespace-nowrap',
              pinned
                ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300'
                : 'border-border bg-card text-foreground',
            )
          : 'size-[34px] text-muted-foreground/70',
      )}
    >
      {showBusy ? (
        <Loader2
          aria-hidden="true"
          className={cn('animate-spin', labelled ? 'size-4' : 'size-[18px]')}
        />
      ) : (
        <Star
          aria-hidden="true"
          className={cn(
            labelled ? 'size-4' : 'size-[18px]',
            pinned && 'fill-amber-400 text-amber-600',
          )}
        />
      )}
      {labelled && (pinned ? 'Pinned' : 'Pin')}
    </button>
  )
}
