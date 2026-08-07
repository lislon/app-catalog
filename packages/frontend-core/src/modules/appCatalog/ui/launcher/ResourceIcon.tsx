import { useState } from 'react'
import type { Resource } from '@igstack/app-catalog-backend-core'
import { cn } from '~/lib/utils'
import { monogramColor, monogramInitials } from './monogram'

/**
 * Resource icon used across the launcher UI.
 * - If the app has an `iconName`, render the served image (`/api/icons/<name>`).
 * - Otherwise fall back to a flat crayon-colored monogram chip (prototype look),
 *   NOT a generic glyph, so every resource still has a recognizable "scent".
 */
export function ResourceIcon({
  app,
  size = 40,
  className,
  rounded = 'rounded-[12px]',
}: {
  app: Pick<Resource, 'iconName' | 'displayName' | 'abbreviation' | 'slug'>
  size?: number
  className?: string
  rounded?: string
}) {
  const [imageError, setImageError] = useState(false)
  const dim = { width: size, height: size }

  if (app.iconName && !imageError) {
    return (
      <img
        src={`/api/icons/${app.iconName}`}
        alt=""
        aria-hidden="true"
        style={dim}
        className={cn(rounded, 'shrink-0 object-contain', className)}
        onError={() => setImageError(true)}
      />
    )
  }

  const initials = monogramInitials(app.displayName, app.abbreviation)
  const bg = monogramColor(app.slug || app.displayName)
  return (
    <span
      aria-hidden="true"
      style={{ ...dim, background: bg, fontSize: Math.round(size * 0.36) }}
      className={cn(
        rounded,
        'shrink-0 grid place-items-center font-semibold text-white font-serif tracking-tight select-none',
        className,
      )}
    >
      {initials}
    </span>
  )
}
