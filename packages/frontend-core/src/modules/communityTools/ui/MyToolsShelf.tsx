import type { CommunityTool } from '@igstack/app-catalog-shared-core'
import { Star } from 'lucide-react'
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

export function ShelfHint({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-testid="shelf-empty-hint"
      className="flex items-center gap-3 rounded-[14px] border-[1.5px] border-dashed border-primary/30 bg-accent/40 px-4 py-3.5 text-accent-foreground"
    >
      <Star aria-hidden="true" className="size-5 shrink-0 text-amber-600" />
      {children}
    </div>
  )
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
 * drop moves a tile; `onReorder` gets the whole new order.
 */
export function MyToolsShelf({
  pins,
  isLoading,
  onUnpin,
  onReorder,
  onSignIn,
}: {
  pins: CommunityTool[]
  isLoading: boolean
  onUnpin: (tool: CommunityTool) => void
  onReorder: (slugs: string[]) => void
  /** Set for an anonymous visitor: pins need an identity to belong to. */
  onSignIn?: () => void
}) {
  const [dragFrom, setDragFrom] = useState<number | null>(null)

  const move = (from: number, to: number) => {
    if (to < 0 || to >= pins.length || from === to) return
    onReorder(moved(pins, from, to).map((t) => t.slug))
  }

  let body: React.ReactNode
  if (onSignIn) {
    body = (
      <ShelfHint>
        <span className="font-semibold">
          Sign in to keep your tools one click away
        </span>
        <button
          type="button"
          onClick={onSignIn}
          className="ml-auto inline-flex h-[34px] items-center rounded-[10px] border border-border bg-card px-3 text-[13px] font-bold text-foreground hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-ring"
        >
          Sign in
        </button>
      </ShelfHint>
    )
  } else if (isLoading) {
    body = <ShelfSkeleton />
  } else if (pins.length === 0) {
    body = (
      <ShelfHint>
        <span>
          <b>Keep your tools one click away.</b> Click the star on any tool
          below and it stays at the top of this page.
        </span>
      </ShelfHint>
    )
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
