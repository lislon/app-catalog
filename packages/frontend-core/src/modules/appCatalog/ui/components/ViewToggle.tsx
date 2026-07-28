import { Link } from '@tanstack/react-router'
import { cn } from '~/lib/utils'

/**
 * Compact segmented toggle for the header (Apps | Service Desks). Rendered in
 * the header's `middle` slot so it adds no header height. Uses router Links so
 * the active segment reflects the current route and each is deep-linkable.
 */
export function ViewToggle() {
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
        className={cn(segment, inactive)}
        activeOptions={{ exact: true }}
        activeProps={{ className: cn(segment, active) }}
      >
        Apps
      </Link>
      <Link
        to="/service-desks"
        aria-label="Service Desks"
        className={cn(segment, inactive)}
        activeProps={{ className: cn(segment, active) }}
      >
        Service Desks
      </Link>
    </div>
  )
}
