import type { CommunityTool } from '@igstack/app-catalog-shared-core'
import { ExternalLink, GripVertical } from 'lucide-react'
import { cn } from '~/lib/utils'
import { ToolThumb } from './FeedRow'
import { PinButton } from './PinButton'

/**
 * A pinned tool: screenshot first, then name and author. A click opens the
 * site. Drag the tile, or press Alt+↑/↓ on it, to move it.
 */
export function ShelfTile({
  tool,
  dragging,
  onUnpin,
  onMove,
  dragProps,
}: {
  tool: CommunityTool
  dragging: boolean
  onUnpin: () => void
  /** -1 moves it one place earlier, +1 one place later. */
  onMove: (step: -1 | 1) => void
  dragProps: React.HTMLAttributes<HTMLDivElement>
}) {
  return (
    <div
      data-testid="shelf-tile"
      draggable
      {...dragProps}
      className={cn(
        'group relative overflow-hidden rounded-[14px] border border-border bg-card transition-[border-color,box-shadow]',
        'hover:border-primary/40 hover:shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30',
        dragging && 'opacity-40',
      )}
    >
      <a
        href={tool.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
        onKeyDown={(e) => {
          if (!e.altKey) return
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault()
            onMove(e.key === 'ArrowUp' ? -1 : 1)
          }
        }}
        className="block focus-visible:outline-none"
      >
        <span className="relative block aspect-[16/9.5] border-b border-border">
          <ToolThumb tool={tool} size={512} className="size-full border-0" />
          <span className="absolute right-2.5 bottom-2.5 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-extrabold text-primary-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <ExternalLink aria-hidden="true" className="size-4" />
            Open site
          </span>
        </span>
        <span className="block py-2.5 pr-12 pl-3">
          <span
            data-testid="shelf-tile-name"
            className="block truncate text-sm font-bold"
          >
            {tool.name}
          </span>
          <span className="block truncate text-[12.5px] font-medium text-muted-foreground">
            {tool.owners.map((o) => o.name).join(', ')}
          </span>
        </span>
      </a>
      <span
        aria-hidden="true"
        className="absolute top-2 right-2 inline-flex size-7 cursor-grab items-center justify-center rounded-md bg-card/90 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
      >
        <GripVertical className="size-4" />
      </span>
      <div className="absolute right-2 bottom-2">
        <PinButton pinned name={tool.name} onToggle={onUnpin} />
      </div>
    </div>
  )
}
