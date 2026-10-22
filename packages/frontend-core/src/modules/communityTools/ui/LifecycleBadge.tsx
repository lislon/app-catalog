import type { Lifecycle } from '@igstack/app-catalog-shared-core'
import { AlertTriangle, Archive } from 'lucide-react'

const PILL =
  'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-px text-[11.5px] font-bold'

/** Next to the name on rows, tiles and the card. An active tool shows nothing. */
export function LifecycleBadge({ lifecycle }: { lifecycle: Lifecycle }) {
  if (lifecycle.state === 'not-working') {
    return (
      <span
        data-testid="lifecycle-badge"
        className={`${PILL} border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300`}
      >
        <AlertTriangle aria-hidden="true" className="size-3" />
        Not working · {lifecycle.days} {lifecycle.days === 1 ? 'day' : 'days'}
      </span>
    )
  }
  if (lifecycle.state === 'archived') {
    return (
      <span
        data-testid="lifecycle-badge"
        className={`${PILL} border-border bg-muted text-muted-foreground`}
      >
        <Archive aria-hidden="true" className="size-3" />
        Archived
      </span>
    )
  }
  return null
}

/** Live since it was published, but no admin has looked at it yet. */
export function UnreviewedBadge() {
  return (
    <span
      data-testid="unreviewed-badge"
      className={`${PILL} border-primary/25 bg-primary/10 text-primary`}
    >
      New · not reviewed
    </span>
  )
}
