import { useMemo, useRef } from 'react'

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
  // Track whether Gallery is in fullscreen — if so, block Radix from closing on Escape
  const isFullscreenRef = useRef(false)

  // Transform screenshot IDs to full URLs
  const images: GalleryImage[] = useMemo(
    () =>
      screenshotIds.map((id) => ({
        url: `/api/screenshots/${id}`,
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
        onEscapeKeyDown={(e) => {
          // If Gallery is in fullscreen, its capture listener already handled Escape.
          // Prevent Radix from also closing the dialog on the same event.
          if (isFullscreenRef.current) {
            e.preventDefault()
          }
        }}
      >
        <VisuallyHidden>
          <DialogTitle>
            {title || `${app.abbreviation || app.displayName} screenshots`}
          </DialogTitle>
        </VisuallyHidden>
        <Gallery
          images={images}
          initialIndex={initialIndex}
          title={title}
          onFullscreenChange={(fs) => {
            isFullscreenRef.current = fs
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
