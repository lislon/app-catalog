import type { CommunityTool } from '@igstack/app-catalog-shared-core'
import { Clock } from 'lucide-react'
import { ToolThumb } from './FeedRow'

/** The last tools whose card the visitor opened, newest first. A chip opens the site. */
export function RecentChips({ tools }: { tools: CommunityTool[] }) {
  if (tools.length === 0) return null
  return (
    <section
      aria-label="Recently opened"
      data-testid="recently-opened"
      className="mt-3.5 flex flex-wrap items-center gap-2"
    >
      <span className="mr-1 inline-flex items-center gap-1.5 text-[13px] font-bold text-muted-foreground">
        <Clock aria-hidden="true" className="size-4" />
        Recently opened
      </span>
      {tools.map((tool) => (
        <a
          key={tool.slug}
          data-testid="recent-chip"
          href={tool.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-[34px] items-center gap-2 rounded-full border border-border bg-card pr-3 pl-[5px] text-[13px] font-semibold whitespace-nowrap transition-colors hover:border-primary/40 hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ToolThumb tool={tool} size={128} className="h-6 w-9 rounded-md" />
          {tool.name}
        </a>
      ))}
    </section>
  )
}
