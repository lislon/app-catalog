import type { RecentTool } from '@igstack/app-catalog-shared-core'
import { RECENT_TOOLS_LIMIT } from '@igstack/app-catalog-shared-core'
import { Clock } from 'lucide-react'
import { ToolThumb } from './FeedRow'

const HOUR_MS = 60 * 60 * 1000

/**
 * When a tool was last opened, as short as a chip allows: "5 min ago",
 * "2 h ago" within the last day, then "yesterday", a weekday within the week,
 * then a date.
 */
export function openedAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso)
  const ms = now.getTime() - then.getTime()
  if (ms < 60 * 1000) return 'just now'
  if (ms < HOUR_MS) return `${Math.floor(ms / 60000)} min ago`
  if (ms < 24 * HOUR_MS) return `${Math.floor(ms / HOUR_MS)} h ago`
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const days = Math.round(
    (day(now).getTime() - day(then).getTime()) / (24 * HOUR_MS),
  )
  if (days <= 1) return 'yesterday'
  if (days < 7) return then.toLocaleDateString('en', { weekday: 'short' })
  return then.toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

/** The last tools whose card the visitor opened, newest first. A chip opens the site. */
export function RecentChips({ tools }: { tools: RecentTool[] }) {
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
      {tools.slice(0, RECENT_TOOLS_LIMIT).map((tool) => (
        <a
          key={tool.slug}
          data-testid="recent-chip"
          href={tool.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-[34px] items-center gap-2 rounded-full border border-border bg-card pr-3 pl-[5px] text-[13px] font-semibold whitespace-nowrap transition-colors hover:border-primary/40 hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ToolThumb tool={tool} size={128} className="h-6 w-9 rounded-md" />
          <span data-testid="recent-chip-name">{tool.name}</span>
          <span
            data-testid="recent-chip-time"
            className="font-medium text-muted-foreground"
          >
            {openedAgo(tool.openedAt)}
          </span>
        </a>
      ))}
    </section>
  )
}
