import type { Resource } from '@igstack/app-catalog-backend-core'
import { X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { useAppCatalogContext } from '../../context/AppCatalogContext'
import { SubResourceDetailPanel } from '../components/SubResourceDetailPanel'
import { AppDetails } from '../detail/AppDetails'

/**
 * Centered detail card over the catalog (#38, item B). Renders the rich
 * AppDetails (access-hero, sub-resources, tiers) as a large centered modal card
 * over the catalog backdrop.
 *
 * When a sub-resource is selected (`?sub=<slug>` — e.g. the user clicked a
 * matched sub-resource row in the search results) the card shows that
 * sub-resource's own detail, with its two-step access chain and a back link to
 * the parent.
 *
 * Escape handling: this component does NOT globally bind Escape. Escape-to-close
 * is owned by AppDetails' own key handling (which first closes an open
 * screenshot gallery, then closes the card), so pressing Esc inside the gallery
 * returns to the card — not all the way to the home page (#38 Esc-stacking bug).
 */
export function AppDetailPanel({
  app,
  subResource,
  onClose,
  onAppClick,
  onBackToParent,
}: {
  app: Resource
  /** Selected child of `app`, when the URL carries `?sub=<slug>`. */
  subResource?: Resource | null
  onClose: () => void
  onAppClick?: (app: Resource) => void
  /** Clears `?sub=` and returns to the parent's detail. */
  onBackToParent?: () => void
}) {
  const { approvalMethods } = useAppCatalogContext()
  const dialogRef = useRef<HTMLDivElement>(null)

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
  }, [app.slug, subResource?.slug])

  // Focus the dialog on mount so Esc hotkeys fire immediately, even when
  // the card was opened by a mouse click (which leaves focus on the grid row).
  //
  // Unless something inside already took the caret — the Quick Jump field does,
  // and it has the better claim: a child's effect runs before its parent's, so
  // without this guard the card would take focus straight back off it.
  //
  // Runs again whenever the card navigates to another resource, keyed the same
  // way the body below is: that navigation destroys whatever was focused (the
  // "View replacement" button, a prerequisite's parent), and without this the
  // caret would land on <body> — where the next Tab walks the catalog grid
  // behind the scrim, since the card has no focus trap.
  const shownSlug = subResource?.slug ?? app.slug
  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.contains(document.activeElement)) dialog.focus()
  }, [shownSlug])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6 md:p-10">
      {/* scrim */}
      <button
        type="button"
        aria-label="Close details panel"
        onClick={onClose}
        className="fixed inset-0 -z-10 bg-black/40 backdrop-blur-[2px] animate-in fade-in"
      />
      {/* centered card — wide enough for data tables (sub-resources have 5
          columns incl. "Access Contacts"/"AWS Account" that wrapped at 760px);
          prose inside AppDetails is width-capped separately so it stays
          readable. Caps at 94vw so it never touches the edges. */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${subResource?.displayName ?? app.displayName} details`}
        tabIndex={-1}
        // Centred on open, then held — see the pin effect above. `my-auto` is
        // deliberately absent: it re-centres on EVERY height change, which is the
        // layout-shift bug.
        // `overflow-hidden` belongs on the rounded box: the scrolling child
        // below carries the band's tint to its own square corners and paints
        // them over this radius, so the card's top corners read as cut off.
        className="relative w-full max-w-[min(1120px,94vw)] overflow-hidden rounded-[var(--radius)] border border-border bg-background shadow-2xl animate-in fade-in zoom-in-95 duration-200 outline-none"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <X className="size-4" />
        </button>
        {/* Keyed by the resource on screen, so the body remounts when the card
            navigates from one app to another ("View replacement", an access
            prerequisite's parent) instead of updating in place. Everything
            per-app inside it is component state with no reset of its own — the
            roles table's expansion, the icon/screenshot error flags, a draft
            source edit — and it used to arrive at the next app still carrying
            the previous one's, plus the previous scroll offset.

            The key is here and not on the outer dialog on purpose: that one
            would restart the open animation and re-run the mount-focus effect
            on every in-card navigation. */}
        <div
          key={shownSlug}
          className="max-h-[85vh] overflow-y-auto px-6 py-5 sm:px-8 sm:py-7"
        >
          {subResource ? (
            <SubResourceDetailPanel
              subResource={subResource}
              parent={app}
              approvalMethods={approvalMethods}
              onBack={onBackToParent ?? onClose}
            />
          ) : (
            <AppDetails
              app={app}
              onAppClick={onAppClick}
              onClosePanel={onClose}
            />
          )}
        </div>
      </div>
    </div>
  )
}
