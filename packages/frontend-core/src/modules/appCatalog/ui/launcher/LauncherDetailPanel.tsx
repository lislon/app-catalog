import type { Resource } from '@igstack/app-catalog-backend-core'
import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useAppCatalogContext } from '../../context/AppCatalogContext'
import { SubResourceDetailPanel } from '../components/SubResourceDetailPanel'
import { AppDetails } from '../grid/AppCatalogGrid'

/**
 * Centered detail card for the launcher (#38, item B). Renders the rich
 * AppDetails (access-hero, sub-resources, tiers) as a large centered modal card
 * over the launcher backdrop, instead of the old grid + resizable split-pane.
 *
 * When a sub-resource is selected (`?sub=<slug>` — e.g. the user clicked a
 * matched sub-resource row in the search results) the card shows that
 * sub-resource's own detail, with its two-step access chain and a back link to
 * the parent, mirroring the grid's split-pane behavior.
 *
 * Escape handling: this component does NOT globally bind Escape. Escape-to-close
 * is owned by AppDetails' own key handling (which first closes an open
 * screenshot gallery, then closes the card), so pressing Esc inside the gallery
 * returns to the card — not all the way to the home page (#38 Esc-stacking bug).
 */
export function LauncherDetailPanel({
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

  // Focus the dialog on mount so Esc hotkeys fire immediately, even when
  // the card was opened by a mouse click (which leaves focus on the grid row).
  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

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
        className="relative w-full max-w-[min(1120px,94vw)] my-auto rounded-[var(--radius)] border border-border bg-background shadow-2xl animate-in fade-in zoom-in-95 duration-200 outline-none"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <X className="size-4" />
        </button>
        <div className="max-h-[85vh] overflow-y-auto px-6 py-5 sm:px-8 sm:py-7">
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
