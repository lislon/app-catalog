import type { CommunityTool } from '@igstack/app-catalog-shared-core'
import { Camera, ImageOff, Maximize2 } from 'lucide-react'
import { useState } from 'react'
import { ScreenshotGallery } from '~/modules/appCatalog/ui/components/ScreenshotGallery'
import { cn } from '~/lib/utils'
import { screenshotUrl } from './FeedRow'

/** The 16:10 box every state shares, so swapping one for another moves nothing. */
const BOX =
  'relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-[14px] border border-border bg-muted shadow-sm'

export function formatCardDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * The tool's screenshot, full width, with Enlarge opening the screenshot
 * viewer. A tool with none yet shows a placeholder in the same box: "still
 * capturing" while its first visit is to come, otherwise "no screenshot".
 */
export function CardScreenshot({
  tool,
  capturing,
}: {
  tool: CommunityTool
  /** A first screenshot is on its way and still worth waiting for. */
  capturing: boolean
}) {
  const [open, setOpen] = useState(false)
  const { screenshotId, capturedAt } = tool

  if (!screenshotId) {
    return (
      <figure data-testid="card-screenshot" className="mt-[22px]">
        <div
          data-testid="card-screenshot-box"
          data-state={capturing ? 'capturing' : 'missing'}
          aria-busy={capturing || undefined}
          className={cn(
            BOX,
            'flex-col gap-2.5 px-6 text-center text-sm font-semibold text-muted-foreground',
          )}
        >
          {capturing ? (
            <>
              <Camera aria-hidden="true" className="size-7 animate-pulse" />
              Taking a screenshot of the site…
            </>
          ) : (
            <>
              <ImageOff aria-hidden="true" className="size-7" />
              No screenshot. The site may need a login, or it did not load.
            </>
          )}
        </div>
        <figcaption className="mt-2 text-[12.5px] font-semibold text-muted-foreground">
          {capturing ? 'Usually under a minute' : 'Open the site to see it'}
        </figcaption>
      </figure>
    )
  }

  return (
    <figure data-testid="card-screenshot" className="mt-[22px]">
      <button
        type="button"
        data-testid="card-screenshot-box"
        data-state="captured"
        aria-label={`Enlarge screenshot of ${tool.name}`}
        onClick={() => setOpen(true)}
        className={cn(
          BOX,
          'cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        )}
      >
        <img
          src={screenshotUrl(screenshotId, 1280)}
          alt={`Screenshot of ${tool.name}`}
          className="size-full object-cover object-left-top"
        />
        <span className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-lg bg-black/70 px-2.5 py-1.5 text-xs font-bold text-white">
          <Maximize2 aria-hidden="true" className="size-3.5" />
          Enlarge
        </span>
      </button>
      {capturedAt && (
        <figcaption className="mt-2 text-[12.5px] font-semibold text-muted-foreground">
          Screenshot captured {formatCardDate(capturedAt)}
        </figcaption>
      )}
      <ScreenshotGallery
        app={{ displayName: tool.name }}
        screenshotIds={[screenshotId]}
        open={open}
        onOpenChange={setOpen}
        title={`${tool.name} screenshot`}
      />
    </figure>
  )
}
