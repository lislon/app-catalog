import type { CatalogMcpServer } from '@igstack/app-catalog-backend-core'
import { Link } from '@tanstack/react-router'
import { Check, Eye, KeyRound, Pencil, TriangleAlert } from 'lucide-react'
import { useMemo } from 'react'
import { cn } from '~/lib/utils'
import { CartButton } from './cart/McpCart'
import { InstallButton } from './install/InstallButton'
import { PersonOrGroupBadge } from '../appCatalog/ui/components/PersonBadge'
import type { McpSearchHit } from './searchMcpServers'
import { searchTerms } from './searchMcpServers'
import { SIGN_IN, STATUS_CHIP } from './signIn'
import { Triad, useRequiredAppNames } from './Triad'
import { useSensitiveDataLabel } from './useMcpCatalogConfig'

const BADGE =
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-muted px-2 py-1 text-[11.5px] leading-none font-bold text-muted-foreground [&_svg]:size-3'

/** `text` with every search term wrapped in `<mark>`. */
export function Highlight({ text, q }: { text: string; q: string }) {
  const terms = searchTerms(q)
  if (terms.length === 0) return text
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const parts = text.split(new RegExp(`(${escaped.join('|')})`, 'gi'))
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="rounded-sm bg-primary/20 px-px text-inherit">
        {part}
      </mark>
    ) : (
      part
    ),
  )
}

/**
 * A search answer: the description leads, because it says what your AI can do;
 * the name and the tool it would call follow, then the safety badges.
 */
export function McpSearchResult({
  hit,
  q,
  best,
  installed,
}: {
  hit: McpSearchHit<CatalogMcpServer>
  q: string
  best: boolean
  /** Marked installed in this browser: greyed, with a badge. */
  installed: boolean
}) {
  const { server, hitTools } = hit
  const sensitiveLabel = useSensitiveDataLabel()
  const tool =
    server.tools.find((t) => t.name === hitTools[0]) ?? server.tools[0]
  const signIn = SIGN_IN[server.auth.kind]
  const status = STATUS_CHIP[server.status]
  const apps = useRequiredAppNames(server)
  const servers = useMemo(() => [server], [server])

  return (
    <article
      data-testid="mcp-result"
      data-installed={installed || undefined}
      className={cn(
        'relative grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-xl border border-border bg-card px-4 py-3.5 transition-[border-color,box-shadow] hover:border-ring hover:shadow-lg',
        best && 'border-[1.5px]',
        installed && 'opacity-55 hover:opacity-90',
      )}
    >
      <span className="relative z-10 inline-flex">
        <Triad server={server} size={48} />
      </span>
      <div className="min-w-0">
        {best && (
          <div className="mb-0.5 text-[11px] font-extrabold tracking-[.06em] text-primary uppercase">
            Best match
          </div>
        )}
        <p className="m-0 text-[15.5px] leading-snug font-bold">
          <Highlight text={server.description} q={q} />
        </p>
        <div className="mt-[3px] mb-2 text-[13px] text-muted-foreground">
          {/* Covers the card: the whole answer opens the server's dialog. */}
          <Link
            to="/mcp/$slug"
            params={{ slug: server.slug }}
            search={(prev) => prev}
            data-testid="mcp-result-name"
            className="font-bold text-foreground outline-none after:absolute after:inset-0 after:rounded-xl after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-ring"
          >
            <Highlight text={server.displayName} q={q} />
          </Link>
          {tool && (
            <>
              {' '}
              · your AI calls{' '}
              <code
                data-testid="mcp-result-calls"
                title={tool.description}
                className="rounded-[5px] bg-muted px-[5px] py-px text-xs"
              >
                <Highlight text={tool.name} q={q} />
              </code>
              {hitTools.length > 1 && ` +${hitTools.length - 1} more`}
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {server.access === 'write' ? (
            <span
              className={cn(
                BADGE,
                'bg-orange-500/15 text-orange-700 dark:text-orange-300',
              )}
              title={server.writeNote ?? 'Can change data'}
            >
              <Pencil aria-hidden="true" />
              Can write
            </span>
          ) : (
            <span
              className={cn(
                BADGE,
                'bg-green-600/15 text-green-700 dark:text-green-300',
              )}
              title="Your AI can only read"
            >
              <Eye aria-hidden="true" />
              Read-only
            </span>
          )}
          {server.sensitiveData && (
            <span className={cn(BADGE, 'bg-destructive/15 text-destructive')}>
              <TriangleAlert aria-hidden="true" />
              {sensitiveLabel}
            </span>
          )}
          <span className={BADGE} title={signIn.tip}>
            <signIn.Icon aria-hidden="true" />
            {signIn.badge}
          </span>
          {status && (
            <span className={cn(BADGE, status.className)}>{status.label}</span>
          )}
          {installed && (
            <span
              className={cn(
                BADGE,
                'bg-green-600/15 text-green-700 dark:text-green-300',
              )}
              title="You marked this as installed in this browser"
            >
              <Check aria-hidden="true" />
              Installed
            </span>
          )}
          {apps.length > 0 && (
            <span className={BADGE} title="You need an account in these apps">
              <KeyRound aria-hidden="true" />
              Needs access: {apps.join(', ')}
            </span>
          )}
          {server.ownerSlug && <PersonOrGroupBadge slug={server.ownerSlug} />}
        </div>
      </div>
      {/* Above the card's stretched link. */}
      <div className="relative z-10 flex flex-wrap items-center justify-end gap-2">
        <InstallButton servers={servers} />
        <CartButton server={server} />
      </div>
    </article>
  )
}
