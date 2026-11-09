import type { CatalogMcpServer } from '@igstack/app-catalog-backend-core'
import { Eye, KeyRound, Pencil, TriangleAlert } from 'lucide-react'
import { cn } from '~/lib/utils'
import { PersonOrGroupBadge } from '../appCatalog/ui/components/PersonBadge'
import type { McpSearchHit } from './searchMcpServers'
import { searchTerms } from './searchMcpServers'
import { SIGN_IN, STATUS_CHIP } from './signIn'
import { Triad, useRequiredAppNames } from './Triad'
import { useMcpCatalogConfig } from './useMcpCatalogConfig'

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
}: {
  hit: McpSearchHit<CatalogMcpServer>
  q: string
  best: boolean
}) {
  const { server, hitTools } = hit
  const sensitiveLabel =
    useMcpCatalogConfig()?.sensitiveDataLabel ?? 'Sensitive data'
  const tool =
    server.tools.find((t) => t.name === hitTools[0]) ?? server.tools[0]
  const signIn = SIGN_IN[server.auth.kind]
  const status = STATUS_CHIP[server.status]
  const apps = useRequiredAppNames(server)

  return (
    <article
      data-testid="mcp-result"
      className={cn(
        'grid grid-cols-[auto_1fr] items-center gap-4 rounded-xl border border-border bg-card px-4 py-3.5 transition-[border-color,box-shadow] hover:border-ring hover:shadow-lg',
        best && 'border-[1.5px]',
      )}
    >
      <Triad server={server} size={48} />
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
          <b
            data-testid="mcp-result-name"
            className="font-bold text-foreground"
          >
            <Highlight text={server.displayName} q={q} />
          </b>
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
          {apps.length > 0 && (
            <span className={BADGE} title="You need an account in these apps">
              <KeyRound aria-hidden="true" />
              Needs access: {apps.join(', ')}
            </span>
          )}
          {server.ownerSlug && <PersonOrGroupBadge slug={server.ownerSlug} />}
        </div>
      </div>
    </article>
  )
}
