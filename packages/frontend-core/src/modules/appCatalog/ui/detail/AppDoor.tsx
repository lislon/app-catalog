import type { Resource } from '@igstack/app-catalog-backend-core'
import { ExternalLink } from 'lucide-react'
import { cn } from '~/lib/utils'
import { ResourceIcon } from '../catalog/ResourceIcon'
import { displayUrl } from '~/modules/appCatalog/utils/displayUrl'

/** Past this many characters the name needs the smaller size step. */
const LONG_TITLE = 28

/** Icon size on the door — one number, applied to image and monogram alike. */
const ICON = 56

function titleText(app: Resource): string {
  return app.abbreviation
    ? `${app.displayName} (${app.abbreviation})`
    : app.displayName
}

/**
 * The way into the app: icon, name and address as ONE pressable surface.
 *
 * Deliberately not a button beside a heading. The complaint this answers is
 * people not knowing where to click, and the card's largest, most obvious
 * element was inert while a small labelled control carried the action — so the
 * largest element becomes the action. Hover and keyboard focus get the SAME
 * treatment, because an affordance only a mouse can discover is no affordance
 * for anyone tabbing; see `.app-door` in index.css for the measured states.
 *
 * Renders plain, unpressable text when the resource has no address — a third of
 * the catalog has none, and a surface that looks pressable and is not is worse
 * than one that never offered.
 */
export function AppDoor({
  app,
  onOpen,
}: {
  app: Resource
  /** Records the visit. Not navigation — the anchor does that itself. */
  onOpen?: () => void
}) {
  const title = titleText(app)
  const titleClass = cn(
    'app-door__title',
    title.length > LONG_TITLE && 'app-door__title--long',
  )

  if (!app.appUrl) {
    return (
      <div className="inline-flex items-center gap-[0.9375rem]">
        <ResourceIcon app={app} size={ICON} />
        <div className="min-w-0">
          <span className={titleClass}>{title}</span>
          {/* Says which of two situations the reader is in: this app has no
              address on file, as opposed to the card having failed to show one.
              The way in, if there is one, is the access tab. */}
          <span className="mt-1 block text-[0.8125rem] italic text-muted-foreground opacity-75">
            No URL for this app.
          </span>
        </div>
      </div>
    )
  }

  const pretty = displayUrl(app.appUrl)

  return (
    <a
      href={app.appUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onOpen}
      className="app-door"
      // Names the destination and the new tab, because the visible text is the
      // app's name and the address on its own line — neither says "opens away
      // from here", and the glyph cannot say it to a screen reader.
      aria-label={`Open ${app.displayName} in a new tab (${pretty})`}
    >
      <ResourceIcon app={app} size={ICON} className="app-door__icon" />
      <span className="min-w-0">
        <span className={titleClass}>{title}</span>
        {/* Truncated, because some of these are 97 characters of Google Sites
            path. Left whole, the longest URL in the catalog set the width of the
            door, pushed the band's own controls onto a second row, and told the
            reader nothing the host had not already told them. The full address is
            on the link's title and in its aria-label, and clicking it is the
            actual way to use it. */}
        <span className="app-door__url truncate" title={pretty}>
          {pretty}
        </span>
      </span>
      <ExternalLink
        className="app-door__glyph size-[18px]"
        aria-hidden="true"
      />
    </a>
  )
}
