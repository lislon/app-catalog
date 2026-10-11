import { useMemo } from 'react'
import { useDismissable } from '~/modules/dismiss/DismissStack'

import type { Resource } from '@igstack/app-catalog-backend-core'

import { Gallery } from '~/modules/gallery/Gallery'
import type { GalleryImage } from '~/modules/gallery/Gallery'
import { Dialog, DialogContent, DialogTitle } from '~/ui/dialog'
import { VisuallyHidden } from '~/ui/visually-hidden'

export interface ScreenshotGalleryProps {
  app: Resource
  screenshotIds: string[]
  initialIndex?: number
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
}

export function ScreenshotGallery({
  app,
  screenshotIds,
  initialIndex = 0,
  open,
  onOpenChange,
  title,
}: ScreenshotGalleryProps) {
  /**
   * The dialog is dismissable through the stack, not through Radix.
   *
   * It no longer needs to know whether the gallery inside it is fullscreen:
   * fullscreen registers above this layer while it is on, so Escape reaches it
   * first and this dialog only hears Escape once fullscreen is off.
   */
  useDismissable(() => onOpenChange(false), { enabled: open })

  // Transform screenshot IDs to URLs. Capped at 2000px — plenty for on-screen
  // viewing (incl. fullscreen zoom) while avoiding multi-MB original downloads
  // for every slide in the carousel (all slides mount at once, unlazy).
  const images: GalleryImage[] = useMemo(
    () =>
      screenshotIds.map((id) => ({
        url: `/api/screenshots/${id}?size=2000`,
        alt: `${app.abbreviation || app.displayName} screenshot`,
      })),
    [screenshotIds, app.abbreviation, app.displayName],
  )

  // Don't render if no screenshots
  if (screenshotIds.length === 0) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="h-[85vh] w-full max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-3rem)] md:max-w-[calc(100vw-4rem)] p-0 overflow-hidden"
        showCloseButton={true}
      >
        <VisuallyHidden>
          <DialogTitle>
            {title || `${app.abbreviation || app.displayName} screenshots`}
          </DialogTitle>
        </VisuallyHidden>
        <Gallery images={images} initialIndex={initialIndex} title={title} />
      </DialogContent>
    </Dialog>
  )
}
