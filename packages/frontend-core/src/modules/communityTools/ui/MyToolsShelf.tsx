import type { CommunityTool } from '@igstack/app-catalog-shared-core'
import { useState } from 'react'
import { Skeleton } from '~/ui/skeleton'
import { ShelfTile } from './ShelfTile'

const GRID = 'grid grid-cols-2 gap-3.5 md:grid-cols-4'

function moved<T>(items: T[], from: number, to: number): T[] {
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item!)
  return next
}

/** Same size as the real shelf, so nothing jumps when the pins arrive. */
function ShelfSkeleton() {
  return (
    <div data-testid="shelf-skeleton" aria-busy="true" className={GRID}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="overflow-hidden rounded-[14px] border border-border bg-card"
        >
          <Skeleton className="aspect-[16/9.5] rounded-none" />
          <div className="flex flex-col gap-1.5 px-3 py-3">
            <Skeleton className="h-2.5 w-2/3" />
            <Skeleton className="h-2.5 w-2/5" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * The visitor's pinned tools, in the order they arranged them. Native drag and
 * drop moves a tile; `onReorder` gets the whole new order. Nothing at all
 * shows until there is a pin: the star on every row is the way in.
 */
export function MyToolsShelf({
  pins,
  isLoading,
  onUnpin,
  onReorder,
}: {
  pins: CommunityTool[]
  isLoading: boolean
  onUnpin: (tool: CommunityTool) => void
  onReorder: (slugs: string[]) => void
}) {
  const [dragFrom, setDragFrom] = useState<number | null>(null)

  const move = (from: number, to: number) => {
    if (to < 0 || to >= pins.length || from === to) return
    onReorder(moved(pins, from, to).map((t) => t.slug))
  }

  if (!isLoading && pins.length === 0) return null

  let body: React.ReactNode
  if (isLoading) {
    body = <ShelfSkeleton />
  } else {
    body = (
      <div className={GRID}>
        {pins.map((tool, index) => (
          <ShelfTile
            key={tool.slug}
            tool={tool}
            dragging={dragFrom === index}
            onUnpin={() => onUnpin(tool)}
            onMove={(step) => move(index, index + step)}
            dragProps={{
              onDragStart: (e) => {
                e.dataTransfer.effectAllowed = 'move'
                setDragFrom(index)
              },
              onDragOver: (e) => {
                if (dragFrom !== null) e.preventDefault()
              },
              onDrop: (e) => {
                e.preventDefault()
                if (dragFrom !== null) move(dragFrom, index)
                setDragFrom(null)
              },
              onDragEnd: () => setDragFrom(null),
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <section aria-labelledby="my-tools-heading" data-testid="my-tools">
      <div className="mb-3 flex items-baseline gap-3">
        <h2
          id="my-tools-heading"
          className="font-serif text-[19px] font-semibold"
        >
          My tools
        </h2>
        {pins.length > 1 && (
          <span className="text-[12.5px] font-medium text-muted-foreground">
            Drag to reorder
          </span>
        )}
      </div>
      {body}
    </section>
  )
}
