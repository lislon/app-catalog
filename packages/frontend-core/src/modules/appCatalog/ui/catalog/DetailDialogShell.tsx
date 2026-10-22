import { Maximize2, Minimize2, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useDismissStack, useDismissable } from '~/modules/dismiss/DismissStack'

const ROUND_BUTTON =
  'rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors'

/**
 * The overlay a detail card lives in: dimmed page, a card centred once on
 * open, Widen and Close at its top right, and a body that scrolls inside it.
 * The official app card and the community tool card both sit in it.
 */
export function DetailDialogShell({
  label,
  shownKey,
  maxWidthClass,
  focusSelector,
  controls,
  testId,
  onClose,
  onKeyDown,
  children,
}: {
  /** The dialog's accessible name. */
  label: string
  /**
   * What the card shows. A new value is a new open: the card re-centres for
   * its own height, takes the caret back, and the body remounts.
   */
  shownKey: string
  /** The width cap while not widened, e.g. `max-w-[min(1120px,94vw)]`. */
  maxWidthClass: string
  /** What takes the caret on open, when it exists; otherwise the dialog. */
  focusSelector?: string
  /** Extra header buttons, placed before Widen. */
  controls?: React.ReactNode
  testId?: string
  onClose: () => void
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>
  children: React.ReactNode
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  // Not persisted: every open starts at the normal width. The toggle is for the
  // one card being read, and the default stays readable for the next one.
  const [isWide, setIsWide] = useState(false)

  /**
   * Centre the card ONCE when it opens, then hold that position.
   *
   * `my-auto` centred it on every render, so each panel height change pushed both
   * edges and half the delta became upward movement of everything above it —
   * including the tab strip, which moved 113px and took the control the user had
   * just clicked with it (CLS 0.19, "needs improvement").
   *
   * Top-anchoring fixed the shift but looked wrong: a short card sat high on the
   * page. So pin the centred offset instead. The card still opens centred, and
   * anything that grows it afterwards extends downward only — which is what a
   * reader expects when they open a tab with more in it.
   *
   * Only on open and on resize. Deliberately NOT on content change: reacting to
   * content is precisely the bug.
   */
  useLayoutEffect(() => {
    const card = dialogRef.current
    const scroller = card?.parentElement
    if (!card || !scroller) return

    const pinCentre = () => {
      card.style.marginTop = '0px'
      const style = getComputedStyle(scroller)
      const usable =
        scroller.clientHeight -
        parseFloat(style.paddingTop) -
        parseFloat(style.paddingBottom)
      const slack = usable - card.offsetHeight
      // Negative slack means the card is already taller than the viewport; leave it
      // at the top and let the overlay scroll, rather than pushing its head off.
      card.style.marginTop = `${Math.max(0, Math.round(slack / 2))}px`
    }

    pinCentre()
    window.addEventListener('resize', pinCentre)
    return () => window.removeEventListener('resize', pinCentre)
    // Keyed on the opened entry: a different card is a new open, and should
    // re-centre for its own height.
  }, [shownKey])

  // Focus the card on mount so Esc hotkeys fire immediately, even when
  // the card was opened by a mouse click (which leaves focus on the grid row).
  //
  // The door link rather than the dialog itself when the card has one: Enter on
  // a search result opens the card, so a second Enter is the browser's own link
  // activation and takes the reader into the app. No door: the dialog.
  //
  // Unless something inside already took the caret — the Quick Jump field does,
  // and it has the better claim: a child's effect runs before its parent's, so
  // without this guard the card would take focus straight back off it.
  //
  // Runs again whenever the card navigates to another entry, keyed the same
  // way the body below is: that navigation destroys whatever was focused (the
  // "View replacement" button, a prerequisite's parent), and without this the
  // caret would land on <body> — where the next Tab walks the page behind the
  // scrim, since the card has no focus trap.
  const stack = useDismissStack()
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || dialog.contains(document.activeElement)) return
    // Only while the card is on top. A layer opened OVER it — a deployment's
    // dialog on a nested route — owns the caret, and on a cold deep link that
    // layer mounts before the card does, so without this check the card took
    // focus back off the dialog's first field the moment the catalog arrived.
    const top = stack.topElement()
    if (top && top !== dialog) return
    const target =
      (focusSelector && dialog.querySelector<HTMLElement>(focusSelector)) ||
      dialog
    target.focus()
  }, [shownKey, stack, focusSelector])

  // Escape closes the card. Registered on the layer's own element, so a layer
  // opened over it (the screenshot viewer) gets Escape first.
  useDismissable(dialogRef, onClose)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6 md:p-10">
      {/* scrim */}
      <button
        type="button"
        aria-label="Close details panel"
        onClick={onClose}
        className="fixed inset-0 -z-10 bg-black/40 backdrop-blur-[2px] animate-in fade-in"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        data-testid={testId}
        onKeyDown={onKeyDown}
        // Centred on open, then held — see the pin effect above. `my-auto` is
        // deliberately absent: it re-centres on EVERY height change, which is the
        // layout-shift bug.
        // `overflow-hidden` belongs on the rounded box: the scrolling child
        // below carries the band's tint to its own square corners and paints
        // them over this radius, so the card's top corners read as cut off.
        // Widening drops the cap only. The pinned top margin is left alone, so
        // the card's top edge stays put and restoring gives back the same layout.
        className={`relative w-full ${isWide ? 'max-w-none' : maxWidthClass} overflow-hidden rounded-[var(--radius)] border border-border bg-background shadow-2xl animate-in fade-in zoom-in-95 duration-200 outline-none`}
      >
        {/* On a backdrop of its own: the body scrolls under these buttons. */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-full bg-background/90 p-0.5 backdrop-blur-sm">
          {controls}
          <button
            type="button"
            aria-label={isWide ? 'Restore width' : 'Widen card'}
            title={isWide ? 'Restore width' : 'Widen card'}
            onClick={() => setIsWide((wide) => !wide)}
            className={ROUND_BUTTON}
          >
            {isWide ? (
              <Minimize2 className="size-4" />
            ) : (
              <Maximize2 className="size-4" />
            )}
          </button>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className={ROUND_BUTTON}
          >
            <X className="size-4" />
          </button>
        </div>
        {/* Keyed by the entry on screen, so the body remounts when the card
            navigates from one entry to another instead of updating in place.
            Everything per-entry inside it is component state with no reset of
            its own — the roles table's expansion, the icon/screenshot error
            flags, a draft source edit — and it used to arrive at the next
            entry still carrying the previous one's, plus the previous scroll
            offset.

            The key is here and not on the outer dialog on purpose: that one
            would restart the open animation and re-run the mount-focus effect
            on every in-card navigation. */}
        <div
          key={shownKey}
          className="max-h-[85vh] overflow-y-auto px-6 py-5 sm:px-8 sm:py-7"
        >
          {children}
        </div>
      </div>
    </div>
  )
}

/** The round header button style, for a card's own `controls`. */
export const DIALOG_ROUND_BUTTON = ROUND_BUTTON
