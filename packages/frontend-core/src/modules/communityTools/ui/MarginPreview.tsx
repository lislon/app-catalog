import type { CommunityTool } from '@igstack/app-catalog-shared-core'
import { useEffect, useRef, useState } from 'react'
import { screenshotUrl } from './FeedRow'

/** Less free margin than this beside the column and there is no preview. */
const MIN_MARGIN = 420
/** Hover or focus this long before the first preview shows. */
const FIRST_SHOW_MS = 300
const GAP = 12

interface Box {
  left: number
  top: number
  width: number
  height: number
}

/**
 * The hovered or focused row's screenshot, big, in the empty margin left of
 * the feed: one reused panel whose top lines up with the row's, moved up only
 * as far as it takes to stay in the window. The first one waits a moment;
 * moving to another row swaps it at once. Nothing on a narrow window, on a
 * touch screen, or while a dialog is open.
 */
export function MarginPreview({
  list,
  tools,
  disabled,
}: {
  /**
   * The element the rows are in; hover and focus are read off it. Inside it
   * sits `[data-preview-column]`, the centred column whose left margin holds
   * the preview, inside `[data-preview-scroller]`.
   */
  list: HTMLElement | null
  tools: CommunityTool[]
  disabled: boolean
}) {
  const [slug, setSlug] = useState<string | null>(null)
  const [box, setBox] = useState<Box | null>(null)
  const rowRef = useRef<HTMLElement | null>(null)
  const [canHover] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches,
  )

  useEffect(() => {
    const scroller = list?.closest<HTMLElement>('[data-preview-scroller]')
    const column = list?.closest<HTMLElement>('[data-preview-column]')
    if (!list || !scroller || !column || !canHover || disabled) return
    let timer: ReturnType<typeof setTimeout> | undefined
    let shown = false

    const place = (): Box | null => {
      const row = rowRef.current
      if (!row?.isConnected) return null
      const area = scroller.getBoundingClientRect()
      const margin = column.getBoundingClientRect().left - area.left
      if (margin < MIN_MARGIN) return null
      const width = margin - 2 * GAP
      const height = Math.round((width * 10) / 16)
      const top = Math.max(
        area.top,
        Math.min(
          row.getBoundingClientRect().top,
          window.innerHeight - height - GAP,
        ),
      )
      return { left: area.left + GAP, top, width, height }
    }
    const show = () => {
      shown = true
      setSlug(rowRef.current?.dataset['slug'] ?? null)
      setBox(place())
    }
    const hide = () => {
      clearTimeout(timer)
      shown = false
      rowRef.current = null
      setSlug(null)
      setBox(null)
    }
    const enter = (target: EventTarget | null) => {
      const row =
        target instanceof Element
          ? target.closest<HTMLElement>('[data-testid="feed-row"]')
          : null
      if (!row || row === rowRef.current) return
      rowRef.current = row
      clearTimeout(timer)
      if (shown) show()
      else timer = setTimeout(show, FIRST_SHOW_MS)
    }
    const onPointerOver = (e: PointerEvent) => enter(e.target)
    const onFocusIn = (e: FocusEvent) => enter(e.target)
    const onFocusOut = (e: FocusEvent) => {
      if (!list.contains(e.relatedTarget as Node | null)) hide()
    }
    // Scrolling under a still-hovered row keeps the panel on it.
    const follow = () => {
      if (shown) setBox(place())
    }

    list.addEventListener('pointerover', onPointerOver)
    list.addEventListener('pointerleave', hide)
    list.addEventListener('focusin', onFocusIn)
    list.addEventListener('focusout', onFocusOut)
    scroller.addEventListener('scroll', follow, { passive: true })
    window.addEventListener('resize', follow)
    return () => {
      hide()
      list.removeEventListener('pointerover', onPointerOver)
      list.removeEventListener('pointerleave', hide)
      list.removeEventListener('focusin', onFocusIn)
      list.removeEventListener('focusout', onFocusOut)
      scroller.removeEventListener('scroll', follow)
      window.removeEventListener('resize', follow)
    }
  }, [list, canHover, disabled])

  const shot = tools.find((t) => t.slug === slug)?.screenshotId
  if (disabled || !box || !shot) return null
  return (
    <div
      aria-hidden="true"
      data-testid="margin-preview"
      className="pointer-events-none fixed top-0 z-20 overflow-hidden rounded-[14px] border border-border bg-muted shadow-lg transition-transform duration-[120ms] ease-out"
      style={{
        left: box.left,
        width: box.width,
        height: box.height,
        transform: `translateY(${box.top}px)`,
      }}
    >
      <img
        src={screenshotUrl(shot, 1280)}
        alt=""
        className="size-full object-cover object-left-top"
      />
    </div>
  )
}
