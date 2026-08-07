import type { Resource } from '@igstack/app-catalog-backend-core'
import { AppDetails } from '../grid/AppCatalogGrid'

/**
 * Centered detail card for the launcher (#38, item B). Renders the rich
 * AppDetails (access-hero, sub-resources, tiers) as a large centered modal card
 * over the launcher backdrop, instead of the old grid + resizable split-pane.
 *
 * Escape handling: this component does NOT globally bind Escape. Escape-to-close
 * is owned by AppDetails' own key handling (which first closes an open
 * screenshot gallery, then closes the card), so pressing Esc inside the gallery
 * returns to the card — not all the way to the home page (#38 Esc-stacking bug).
 */
export function LauncherDetailPanel({
  app,
  onClose,
  onAppClick,
}: {
  app: Resource
  onClose: () => void
  onAppClick?: (app: Resource) => void
}) {
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
        role="dialog"
        aria-modal="true"
        aria-label={`${app.displayName} details`}
        className="relative w-full max-w-[min(1120px,94vw)] my-auto rounded-[var(--radius)] border border-border bg-background shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="max-h-[85vh] overflow-y-auto px-6 py-5 sm:px-8 sm:py-7">
          <AppDetails
            app={app}
            onAppClick={onAppClick}
            onClosePanel={onClose}
          />
        </div>
      </div>
    </div>
  )
}
