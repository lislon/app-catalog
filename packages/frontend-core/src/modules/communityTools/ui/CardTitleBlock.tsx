import type { CommunityTool } from '@igstack/app-catalog-shared-core'
import { Globe } from 'lucide-react'
import { cn } from '~/lib/utils'
import { recordSiteOpen } from '../siteOpen'
import { screenshotUrl } from './FeedRow'
import { LifecycleBadge, UnreviewedBadge } from './LifecycleBadge'

/**
 * The card's door: favicon (a globe when the site has none), name, badges and
 * address, all one link that opens the site.
 */
export function CardTitleBlock({ tool }: { tool: CommunityTool }) {
  const archived = tool.lifecycle.state === 'archived'
  return (
    <a
      href={tool.url}
      onClick={() => recordSiteOpen(tool.slug)}
      data-testid="card-title-block"
      className={cn(
        'group/door inline-flex min-w-0 items-center gap-[15px] rounded-[14px] border border-border bg-primary/[0.025] px-[17px] py-[11px] transition-colors',
        'hover:border-primary/40 hover:bg-primary/[0.07] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        archived && 'opacity-70 grayscale',
      )}
    >
      <span className="inline-flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-card text-muted-foreground">
        {tool.faviconId ? (
          <img
            src={screenshotUrl(tool.faviconId, 64)}
            alt=""
            className="size-7"
          />
        ) : (
          <Globe aria-hidden="true" className="size-6" strokeWidth={1.75} />
        )}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span
            data-testid="card-tool-name"
            className="font-serif text-[26px] leading-tight font-semibold"
          >
            {tool.name}
          </span>
          <LifecycleBadge lifecycle={tool.lifecycle} />
          {!tool.reviewed && <UnreviewedBadge />}
        </span>
        <span className="truncate font-mono text-[13px] text-muted-foreground">
          {tool.host}
        </span>
      </span>
    </a>
  )
}
