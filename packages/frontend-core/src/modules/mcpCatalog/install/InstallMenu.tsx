import type { InstallOptionId } from '@igstack/app-catalog-shared-core'
import { Check } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDismissable } from '~/modules/dismiss/DismissStack'
import type { InstallOption } from './installOptions'
import { VISIBLE_INSTALL_OPTIONS } from './installOptions'

const WIDTH = 280

/**
 * The install choices under a split button: "Install with" an AI, or "Text
 * only". Fixed to the viewport beside `anchor`, in a portal at the end of
 * `<body>` so a dialog's clipping cannot cut it and the dismiss stack sees it
 * on top of the dialog that opened it.
 */
export function InstallMenu({
  anchor,
  current,
  onPick,
  onClose,
}: {
  /** What the menu opens beside; a press inside it is not "outside". */
  anchor: React.RefObject<HTMLElement | null>
  current?: InstallOptionId
  onPick: (id: InstallOptionId) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number }>()
  useDismissable(ref, onClose)

  useLayoutEffect(() => {
    const menu = ref.current
    const r = anchor.current?.getBoundingClientRect()
    if (!menu || !r) return
    const h = menu.offsetHeight
    setPos({
      left: Math.max(8, Math.min(r.right - WIDTH, innerWidth - WIDTH - 8)),
      top:
        r.bottom + 6 + h > innerHeight
          ? Math.max(8, r.top - h - 6)
          : r.bottom + 6,
    })
  }, [anchor])

  // Once placed (a hidden element refuses focus): the remembered choice, else
  // the first, and the arrows walk on from there.
  useEffect(() => {
    if (!pos) return
    const menu = ref.current
    ;(
      menu?.querySelector<HTMLElement>('[aria-checked="true"]') ??
      menu?.querySelector<HTMLElement>('[role="menuitemradio"]')
    )?.focus()
  }, [pos])

  // A press outside, or a scroll that would leave it floating, closes it.
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (!ref.current?.contains(t) && !anchor.current?.contains(t)) onClose()
    }
    const onScroll = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [anchor, onClose])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const items = [
      ...(ref.current?.querySelectorAll<HTMLElement>(
        '[role="menuitemradio"]',
      ) ?? []),
    ]
    const i = items.indexOf(document.activeElement as HTMLElement)
    const step = e.key === 'ArrowDown' ? 1 : -1
    items[(i + step + items.length) % items.length]?.focus()
  }

  const group = (title: string, options: readonly InstallOption[]) => (
    <div role="group" aria-label={title}>
      <div
        aria-hidden="true"
        className="px-2 pt-2 pb-1 text-[11px] font-extrabold tracking-[.06em] text-muted-foreground uppercase"
      >
        {title}
      </div>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="menuitemradio"
          aria-checked={o.id === current}
          onClick={() => onPick(o.id)}
          className="flex w-full items-center gap-2.5 rounded-[10px] px-2 py-[7px] text-left outline-none hover:bg-muted focus-visible:bg-muted"
        >
          <o.Icon />
          <span className="min-w-0 flex-1">
            <b className="block text-[13.5px]">{o.label}</b>
            <small className="block text-xs text-muted-foreground">
              {o.hint}
            </small>
          </span>
          {o.id === current && (
            <Check aria-hidden="true" className="size-4 text-primary" />
          )}
        </button>
      ))}
    </div>
  )

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label="Choose how to install"
      onKeyDown={onKeyDown}
      style={{ width: WIDTH, ...pos, visibility: pos ? undefined : 'hidden' }}
      className="fixed z-[60] rounded-[var(--radius)] border border-border bg-card p-1.5 text-foreground shadow-2xl"
    >
      {group(
        'Install with',
        VISIBLE_INSTALL_OPTIONS.filter((o) => !o.text),
      )}
      {group(
        'Text only',
        VISIBLE_INSTALL_OPTIONS.filter((o) => o.text),
      )}
      <div
        data-slot="footer"
        className="mt-1 border-t border-border px-2 pt-1.5 pb-1 text-[11.5px] text-muted-foreground"
      >
        We remember your choice for next time.
      </div>
    </div>,
    document.body,
  )
}
