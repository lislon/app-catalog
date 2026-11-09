import type { CatalogMcpServer } from '@igstack/app-catalog-backend-core'
import { Search, Sparkles, X } from 'lucide-react'
import { DynamicIcon, iconNames } from 'lucide-react/dynamic'
import type { IconName } from 'lucide-react/dynamic'
import type { ComponentProps } from 'react'
import { useMemo, useRef } from 'react'
import {
  getGroupBySlug,
  getPersonBySlug,
} from '../appCatalog/utils/resolveHelpers'
import { useAppCatalogContext } from '../appCatalog/context/AppCatalogContext'
import { cn } from '~/lib/utils'
import { McpCart } from './cart/McpCart'
import { useMcpCart } from './cart/useMcpCart'
import { useMcpPrefs } from './install/useMcpPrefs'
import { McpSearchResult } from './McpSearchResult'
import { McpServerRow } from './McpServerRow'
import { searchMcpServers } from './searchMcpServers'
import { Triad } from './Triad'
import { useMcpCatalogConfig } from './useMcpCatalogConfig'

const CHIP =
  'min-h-[30px] rounded-full border border-border bg-card px-3 py-1 text-[13px] font-semibold text-foreground transition-colors hover:border-ring aria-pressed:border-primary/40 aria-pressed:bg-accent aria-pressed:text-accent-foreground'

const SECTION_HEADING =
  'mx-auto mt-11 mb-3.5 flex max-w-[1100px] flex-wrap items-baseline gap-x-2.5 gap-y-1'

/** For an intent whose icon is not a lucide name. */
function FallbackIcon() {
  return <Sparkles aria-hidden="true" className="size-[18px]" />
}

function isIconName(name: string): name is IconName {
  return (iconNames as string[]).includes(name)
}

/** Configured categories first, in config order; the rest alphabetically by key. */
function groupByCategory(
  servers: readonly CatalogMcpServer[],
  categories: readonly { key: string; title: string }[],
): { key: string; title: string; servers: CatalogMcpServer[] }[] {
  const keys = [...new Set(servers.map((s) => s.category))]
  const rank = (key: string) => {
    const i = categories.findIndex((c) => c.key === key)
    return i === -1 ? categories.length : i
  }
  return keys
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
    .map((key) => ({
      key,
      title: categories.find((c) => c.key === key)?.title ?? key,
      servers: servers
        .filter((s) => s.category === key)
        .sort((a, b) => a.displayName.localeCompare(b.displayName)),
    }))
}

export interface McpCatalogPageProps {
  /** `?q=`: the URL is the search's only home, so a shared link restores it. */
  q: string
  /** Every edit of the search, for the URL to carry. */
  onQueryChange: (q: string) => void
}

const NO_SERVERS: CatalogMcpServer[] = []

/**
 * The MCP servers tab. At rest it asks what your AI should be able to do and
 * lists every server by category; a search turns the list into ranked answers.
 */
export function McpCatalogPage({ q, onQueryChange }: McpCatalogPageProps) {
  const {
    mcpServers = NO_SERVERS,
    isLoadingApps,
    persons,
    groups: ownerGroups,
  } = useAppCatalogContext()
  const config = useMcpCatalogConfig()
  const { installed } = useMcpPrefs()
  const cartShown = useMcpCart().servers.length > 0
  const inputRef = useRef<HTMLInputElement>(null)
  const setQuery = onQueryChange

  const results = useMemo(
    () =>
      searchMcpServers(mcpServers, q, {
        categoryTitle: (key) =>
          config?.categories?.find((c) => c.key === key)?.title,
        ownerName: (slug) => {
          const person = getPersonBySlug(persons, slug)
          return person
            ? `${person.firstName} ${person.lastName}`
            : getGroupBySlug(ownerGroups, slug)?.displayName
        },
      }),
    [mcpServers, q, config?.categories, persons, ownerGroups],
  )
  const groups = useMemo(
    () => groupByCategory(mcpServers, config?.categories ?? []),
    [mcpServers, config?.categories],
  )
  const searching = q.trim() !== ''
  const tryQueries = config?.tryQueries ?? []
  const sensitiveLabel = config?.sensitiveDataLabel ?? 'Sensitive data'

  const tryChips = (queries: readonly string[]) => (
    <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5 text-[13px] text-muted-foreground">
      <span>try:</span>
      {queries.map((t) => (
        <button
          key={t}
          type="button"
          className={CHIP}
          aria-pressed={q.trim().toLowerCase() === t.toLowerCase()}
          onClick={() => setQuery(t)}
        >
          {t}
        </button>
      ))}
    </div>
  )

  return (
    <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
      <div
        className={cn(
          'mx-auto w-full max-w-[1100px] px-1 pt-5 pb-12',
          // Room for the fixed cart bar, so it never covers the last row.
          cartShown && 'pb-36',
        )}
      >
        <section className="mx-auto max-w-[860px] text-center">
          <h1 className="m-0 font-serif text-[40px] leading-[1.08] font-semibold tracking-[-.02em]">
            What should <em className="text-primary not-italic">your AI</em> be
            able to do?
          </h1>
          <p className="mx-auto mt-2.5 mb-[22px] max-w-[600px] text-[15.5px] text-muted-foreground">
            Describe the job. We find the MCP servers that give your assistant
            those tools.
          </p>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="absolute top-5 left-[18px] size-[18px] text-muted-foreground"
            />
            <input
              ref={inputRef}
              type="search"
              value={q}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              aria-label="Search MCP servers"
              placeholder="e.g. “search logs”, “read a ticket”, “query the warehouse”"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setQuery('')
              }}
              className="h-[58px] w-full rounded-[calc(var(--radius)+4px)] border border-border bg-card pr-12 pl-[50px] text-[17px] text-foreground shadow-lg transition-[border-color,box-shadow] outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/20 [&::-webkit-search-cancel-button]:hidden"
            />
            {searching && (
              <button
                type="button"
                aria-label="Clear search"
                className="absolute top-[13px] right-3 grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
                onClick={() => {
                  setQuery('')
                  inputRef.current?.focus()
                }}
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            )}
          </div>
          {tryQueries.length > 0 && tryChips(tryQueries)}
        </section>

        {searching ? (
          results.length === 0 ? (
            <div className="mx-auto my-6 max-w-[700px] rounded-xl border border-dashed border-border p-7 text-center text-muted-foreground">
              <b className="mb-1.5 block text-base text-foreground">
                No server gives your AI “{q.trim()}” yet
              </b>
              Try a system name or a verb.
              {tryQueries.length > 0 && tryChips(tryQueries)}
            </div>
          ) : (
            <>
              <div className={SECTION_HEADING}>
                <h2 className="m-0 font-serif text-2xl font-semibold tracking-[-.01em]">
                  {results.length} way{results.length > 1 ? 's' : ''} to “
                  {q.trim()}”
                </h2>
                <span className="text-[13px] text-muted-foreground">
                  matched on tool names first, then descriptions
                </span>
              </div>
              <div className="grid gap-2.5">
                {results.map((hit, i) => (
                  <McpSearchResult
                    key={hit.server.slug}
                    hit={hit}
                    q={q}
                    best={i === 0}
                    installed={installed.has(hit.server.slug)}
                  />
                ))}
              </div>
            </>
          )
        ) : (
          <>
            {(config?.intents?.length ?? 0) > 0 && (
              <div className="mx-auto mt-9 grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-2.5">
                {config?.intents?.map((intent) => (
                  <button
                    key={intent.query}
                    type="button"
                    className="flex min-h-16 items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 text-left transition-[border-color,box-shadow] hover:border-ring hover:shadow-lg"
                    onClick={() => setQuery(intent.query)}
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary/10 text-primary">
                      {isIconName(intent.icon) ? (
                        <DynamicIcon
                          name={intent.icon}
                          aria-hidden="true"
                          className="size-[18px]"
                          fallback={() => <FallbackIcon />}
                        />
                      ) : (
                        <FallbackIcon />
                      )}
                    </span>
                    <span>
                      <b className="block text-sm">{intent.title}</b>
                      <span className="text-[12.5px] text-muted-foreground">
                        {intent.caption}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className={SECTION_HEADING}>
              <h2 className="m-0 font-serif text-2xl font-semibold tracking-[-.01em]">
                Every server
              </h2>
              {!isLoadingApps && (
                <span className="text-[13px] text-muted-foreground">
                  {mcpServers.length} server
                  {mcpServers.length === 1 ? '' : 's'}
                </span>
              )}
              <span className="ml-auto flex flex-wrap items-center gap-3.5 text-[12.5px] text-muted-foreground">
                <LegendItem
                  server={{ access: 'write' }}
                  text="top: eye reads, pencil writes"
                />
                <LegendItem
                  server={{ access: 'read', requiredAppSlugs: ['other apps'] }}
                  text="left dot: needs access"
                />
                <LegendItem
                  server={{ access: 'read', sensitiveData: true }}
                  text={`right dot: ${sensitiveLabel.toLowerCase()}`}
                />
              </span>
            </div>
            <div className="columns-[3_300px] gap-7">
              {groups.map((group) => (
                <section
                  key={group.key}
                  data-testid="mcp-category"
                  aria-labelledby={`mcp-category-${group.key}`}
                  className="mb-[22px] break-inside-avoid"
                >
                  <h3
                    id={`mcp-category-${group.key}`}
                    className="mb-1.5 flex gap-1.5 text-xs font-extrabold tracking-[.06em] text-muted-foreground uppercase"
                  >
                    <span
                      aria-hidden="true"
                      className="h-[3px] w-4 self-center rounded-full bg-primary"
                    />
                    {group.title}
                  </h3>
                  <ul className="m-0 list-none p-0">
                    {group.servers.map((server) => (
                      <McpServerRow
                        key={server.slug}
                        server={server}
                        installed={installed.has(server.slug)}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
      <McpCart />
    </div>
  )
}

function LegendItem({
  server,
  text,
}: {
  server: ComponentProps<typeof Triad>['server']
  text: string
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Triad server={server} size={20} decorative />
      {text}
    </span>
  )
}
