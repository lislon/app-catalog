import type { CommunityTool } from '@igstack/app-catalog-shared-core'
import { Camera, ImageOff, Maximize2 } from 'lucide-react'
import { useState } from 'react'
import { ScreenshotGallery } from '~/modules/appCatalog/ui/components/ScreenshotGallery'
import { cn } from '~/lib/utils'
import { recordSiteOpen } from '../siteOpen'
import { screenshotUrl } from './FeedRow'

/**
 * The 16:10 box every state shares, so swapping one for another moves nothing.
 * Capped in height, so how to use it and who to ask stay above the fold; the
 * top of the page, where its title is, is what shows.
 */
const BOX =
  'relative flex aspect-[16/10] max-h-[320px] w-full items-center justify-center overflow-hidden rounded-[14px] border border-border bg-muted shadow-sm'

/** The server's checks get no answer, so there is no fresh screenshot to show. */
const UNREACHABLE =
  "Screenshot unavailable: the catalog's server can't reach this site."

export function formatCardDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * The tool's screenshot, full width: a click opens the site, like the title
 * block, and the corner button enlarges it in the screenshot viewer. A tool
 * with none yet shows a placeholder in the same box, not a link: "still
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
              {tool.serverUnreachable ? (
                <span data-testid="card-server-unreachable">{UNREACHABLE}</span>
              ) : (
                'No screenshot. The site may need a login, or it did not load.'
              )}
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
      <div
        data-testid="card-screenshot-box"
        data-state="captured"
        className={BOX}
      >
        <a
          href={tool.url}
          onClick={() => recordSiteOpen(tool.slug)}
          aria-label={`Open ${tool.name}`}
          data-testid="card-screenshot-link"
          className="group/shot block size-full rounded-[14px] focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ring"
        >
          <img
            src={screenshotUrl(screenshotId, 1280)}
            alt={`Screenshot of ${tool.name}`}
            className="size-full object-cover object-left-top"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-focus-visible/shot:bg-black/20 group-hover/shot:bg-black/20">
            <span className="rounded-lg bg-primary px-3.5 py-2 text-sm font-extrabold text-primary-foreground opacity-0 shadow-sm transition-opacity group-focus-visible/shot:opacity-100 group-hover/shot:opacity-100">
              Open site
            </span>
          </span>
        </a>
        {/* Beside the link, not in it: enlarging never opens the site. */}
        <button
          type="button"
          aria-label={`Enlarge screenshot of ${tool.name}`}
          title="Enlarge"
          onClick={() => setOpen(true)}
          className="absolute top-3 right-3 inline-flex size-8 items-center justify-center rounded-lg bg-black/65 text-white hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Maximize2 aria-hidden="true" className="size-4" />
        </button>
      </div>
      {(capturedAt || tool.serverUnreachable) && (
        <figcaption className="mt-2 text-[12.5px] font-semibold text-muted-foreground">
          {capturedAt && `Screenshot captured ${formatCardDate(capturedAt)}`}
          {tool.serverUnreachable && (
            <span data-testid="card-server-unreachable" className="block">
              {UNREACHABLE}
            </span>
          )}
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
