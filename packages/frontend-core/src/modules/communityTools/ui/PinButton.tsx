import { Star } from 'lucide-react'
import { cn } from '~/lib/utils'

/** The star on rows and tiles: pins the tool to My tools, or takes it off. */
export function PinButton({
  pinned,
  name,
  onToggle,
}: {
  pinned: boolean
  name: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      data-testid="pin-button"
      aria-pressed={pinned}
      aria-label={pinned ? `Unpin ${name}` : `Pin ${name} to My tools`}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      className={cn(
        'relative z-10 inline-flex size-[34px] shrink-0 items-center justify-center rounded-[9px] text-muted-foreground/70 transition-colors',
        'hover:bg-accent hover:text-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
      )}
    >
      <Star
        aria-hidden="true"
        className={cn('size-[18px]', pinned && 'fill-amber-400 text-amber-600')}
      />
    </button>
  )
}
