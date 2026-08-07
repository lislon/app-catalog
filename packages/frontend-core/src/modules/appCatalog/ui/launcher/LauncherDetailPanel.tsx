import type { Resource } from '@igstack/app-catalog-backend-core'
import { useEffect } from 'react'
import { AppDetails } from '../grid/AppCatalogGrid'

/**
 * Slide-over detail panel for the launcher (#38, item B). Renders the rich
 * AppDetails (access-hero, sub-resources, tiers — increments 3/4) as a right
 * slide-over over the launcher backdrop, matching the option-a prototype,
 * instead of dropping the user into the old grid + resizable split-pane.
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
  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      {/* scrim */}
      <button
        type="button"
        aria-label="Close details panel"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] animate-in fade-in"
      />
      {/* panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${app.displayName} details`}
        className="fixed right-0 top-0 z-50 h-full w-[min(560px,100%)] bg-background shadow-2xl border-l border-border flex flex-col animate-in slide-in-from-right duration-200"
      >
        <div className="overflow-y-auto flex-1 px-6 py-5">
          <AppDetails
            app={app}
            onAppClick={onAppClick}
            onClosePanel={onClose}
          />
        </div>
      </aside>
    </>
  )
}
