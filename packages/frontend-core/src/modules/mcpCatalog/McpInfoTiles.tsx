import type { CatalogMcpServer } from '@igstack/app-catalog-backend-core'
import { BookOpen, MessageCircle, User } from 'lucide-react'
import type { ReactNode } from 'react'
import { useAppCatalogContext } from '../appCatalog/context/AppCatalogContext'
import { SourcePulse } from '../appCatalog/ui/components/SourcePulse'
import { useSourceUrlsWithPulse } from '../appCatalog/ui/components/SourcesList'
import {
  getGroupBySlug,
  getPersonBySlug,
} from '../appCatalog/utils/resolveHelpers'
import { displayUrl } from '../appCatalog/utils/displayUrl'

const TILE =
  'relative flex aspect-square w-[120px] min-w-0 flex-col gap-1 rounded-[var(--radius)] border border-border bg-card p-3 text-foreground transition-colors'
const LINK_TILE = `${TILE} has-[a:hover]:border-ring`
const ICON = 'size-5 text-primary'
/** The icon row; pushes the label and value to the bottom of the square. */
const HEAD = 'mb-auto flex items-start justify-between'
const LABEL =
  'text-[11px] font-extrabold tracking-[.06em] text-muted-foreground uppercase'
const VALUE =
  'line-clamp-2 text-[13px] leading-[1.3] font-bold [overflow-wrap:anywhere]'
/** The tile's link covers the whole square, so the tile is the click target. */
const STRETCHED = 'after:absolute after:inset-0 after:content-[""]'

function LinkTile({
  icon,
  label,
  value,
  href,
  title,
  testId,
  extra,
}: {
  icon: ReactNode
  label: string
  value: string
  href: string
  title: string
  testId?: string
  extra?: ReactNode
}) {
  return (
    <div className={LINK_TILE} data-testid={testId} title={title}>
      <div className={HEAD}>
        {icon}
        {/* Above the stretched link, so its tooltip still opens. */}
        {extra && <span className="relative z-10">{extra}</span>}
      </div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex flex-col gap-1 outline-none focus-visible:after:rounded-[var(--radius)] focus-visible:after:ring-2 focus-visible:after:ring-ring ${STRETCHED}`}
      >
        <small className={LABEL}>{label}</small>
        <b className={VALUE}>{value}</b>
      </a>
    </div>
  )
}

/** Square tiles: who owns it, where to ask, and every source it was written from. */
export function McpInfoTiles({ server }: { server: CatalogMcpServer }) {
  const { persons, groups } = useAppCatalogContext()
  const { urls, pulseByUrl } = useSourceUrlsWithPulse(server.sources)

  const owner = server.ownerSlug
  const person = owner ? getPersonBySlug(persons, owner) : undefined
  // The same fallbacks as PersonBadge: a blank name or group shows the slug.
  const ownerName = person
    ? `${person.firstName} ${person.lastName}`.trim() || owner
    : owner && (getGroupBySlug(groups, owner)?.displayName || owner)

  return (
    <div className="grid grid-cols-[repeat(auto-fill,120px)] gap-2">
      {ownerName && (
        <div className={TILE} data-testid="mcp-tile-owner" title={ownerName}>
          <div className={HEAD}>
            <User aria-hidden="true" className={ICON} />
          </div>
          <small className={LABEL}>Owner</small>
          <b className={VALUE}>{ownerName}</b>
        </div>
      )}
      {server.support && (
        <LinkTile
          icon={<MessageCircle aria-hidden="true" className={ICON} />}
          label="Support"
          value={server.support.label}
          href={server.support.url}
          title={server.support.url}
        />
      )}
      {urls.map((url) => {
        const pulse = pulseByUrl.get(url)
        return (
          <LinkTile
            key={url}
            testId="mcp-tile-source"
            icon={<BookOpen aria-hidden="true" className={ICON} />}
            label="Source"
            value={displayUrl(url)}
            href={url}
            title={url}
            extra={pulse && <SourcePulse pulse={pulse} />}
          />
        )
      })}
    </div>
  )
}
