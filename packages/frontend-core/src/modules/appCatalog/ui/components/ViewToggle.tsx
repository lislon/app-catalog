import { Link, useRouterState } from '@tanstack/react-router'
import { cn } from '~/lib/utils'

/**
 * Compact segmented toggle for the header (Apps | Service Desks). Rendered in
 * the header's `middle` slot so it adds no header height. Uses router Links so
 * each segment is deep-linkable.
 *
 * The active segment is derived from the current pathname rather than a plain
 * exact-match on the Link: the "Apps" tab must stay active on the app-detail
 * routes (`/app/<slug>`) too, since the detail panel is part of the Apps view
 * (#23). A plain `activeOptions={{ exact: true }}` on `to="/"` left both tabs
 * inactive on `/app/<slug>`.
 */
export function ViewToggle() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const appsActive = pathname === '/' || pathname.startsWith('/app/')
  const desksActive = pathname.startsWith('/service-desks')

  const segment =
    'inline-flex items-center rounded-md px-3 py-1 text-sm font-medium transition-colors'
  const active = 'bg-background text-foreground shadow-sm'
  const inactive = 'text-muted-foreground hover:text-foreground'

  return (
    <div
      role="tablist"
      aria-label="View"
      className="inline-flex items-center gap-1 rounded-lg bg-muted p-[3px]"
    >
      <Link
        to="/"
        aria-label="Apps"
        aria-current={appsActive ? 'page' : undefined}
        className={cn(segment, appsActive ? active : inactive)}
      >
        Apps
      </Link>
      <Link
        to="/service-desks"
        aria-label="Service Desks"
        aria-current={desksActive ? 'page' : undefined}
        className={cn(segment, desksActive ? active : inactive)}
      >
        Service Desks
      </Link>
    </div>
  )
}
