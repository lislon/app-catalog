import type { Resource } from '@igstack/app-catalog-backend-core'
import { ArrowUpRight, Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '~/lib/utils'
import { useAppClickHistory } from '../../hooks/useAppClickHistory'
import { markdownToPlainText } from '../../utils/markdownToPlainText'
import { AttributionFooter } from './AttributionFooter'
import { ResourceIcon } from './ResourceIcon'
import { searchResources } from '../../utils/searchApps'
import { Highlight } from '../components/Highlight'

/**
 * Adaptive-home discovery spine (issue #38, increment 1) — matches the
 * option-a-launcher prototype:
 *   Your apps (frequent) → New this week → Browse all
 *
 * This is the PERSISTENT shell for the catalog: idle browse, active search and
 * an open detail overlay all render inside it. Only the area below the hero
 * swaps (discovery spine ↔ results list), so the hero copy, the search box and
 * the page container never move while the user types. Do not switch the page to
 * a different container on search — that was the layout-jitter bug.
 */

// Type pill text. Plain "application" resources are the common case and don't
// need a badge (the user asked not to show a bare "App" badge); only surface a
// pill for distinctive types (database, cloud, service, …).
const typeLabel = (t?: string): string | null => {
  if (!t || t === 'application') return null
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export interface LauncherHomeProps {
  /** All root (non-child) resources, already filtered for deprecated per settings. */
  apps: Resource[]
  /**
   * All resources INCLUDING children/sub-resources. Passed to search so a query
   * matching a sub-resource (e.g. an AWS account, an alias/account ID) surfaces
   * its parent — preserving the existing cross-sub-resource search behavior.
   * Falls back to `apps` when omitted.
   */
  allResources?: Resource[]
  searchValue: string
  onSearchChange: (v: string) => void
  onAppClick: (app: Resource) => void
  /**
   * Open a matched sub-resource's own detail (parent detail + `?sub=`).
   * Falls back to `onAppClick` when omitted.
   */
  onSubClick?: (parentSlug: string, subSlug: string) => void
  onLaunch: (app: Resource) => void
  /** Total resource count for the "Browse all" label. */
  totalCount: number
  /**
   * True while an app/sub-resource detail overlay is open above the launcher.
   * The results list then stops binding ↑↓/↵/Esc so the overlay owns the
   * keyboard (otherwise Esc would ALSO wipe the search behind the overlay).
   */
  detailOpen?: boolean
  /** Currently open sub-resource slug, for highlighting its row. */
  selectedSubSlug?: string
}

function LaunchButton({
  app,
  onLaunch,
  className,
}: {
  app: Resource
  onLaunch: (app: Resource) => void
  className?: string
}) {
  if (!app.appUrl) return null
  // Show the destination URL on hover (user ask) — the native title tooltip
  // reveals where the ↗ jumps to, e.g. "Open → console.aws.amazon.com".
  const prettyUrl = app.appUrl.replace(/^https?:\/\//, '')
  return (
    <a
      href={app.appUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={`Open → ${prettyUrl}`}
      aria-label={`Open ${app.displayName} in a new tab (${prettyUrl})`}
      onClick={(e) => {
        e.stopPropagation()
        onLaunch(app)
      }}
      className={cn(
        'grid place-items-center rounded-full border border-border bg-card text-muted-foreground',
        'hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors',
        className,
      )}
    >
      <ArrowUpRight className="size-3.5" />
    </a>
  )
}

function SectionHead({
  title,
  count,
  action,
}: {
  title: string
  count?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <h2 className="font-serif font-semibold text-[15px] tracking-tight m-0">
        {title}
      </h2>
      {count && (
        <span className="text-[13px] text-muted-foreground bg-muted rounded-full px-2.5 py-0.5">
          {count}
        </span>
      )}
      {action && <div className="ml-auto">{action}</div>}
    </div>
  )
}

/** Small row used by "New this week" and "Browse all". */
function ResourceRow({
  app,
  onAppClick,
  onLaunch,
  showNew = false,
}: {
  app: Resource
  onAppClick: (app: Resource) => void
  onLaunch: (app: Resource) => void
  showNew?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => onAppClick(app)}
      title={`View ${app.displayName}`}
      className={cn(
        'group flex items-center gap-3.5 w-full text-left',
        'bg-card border border-border rounded-[var(--radius)] px-3.5 py-3',
        'hover:border-ring hover:shadow-sm transition-all',
      )}
    >
      <ResourceIcon app={app} size={38} />
      <span className="flex-1 min-w-0">
        <span className="block text-[14.5px] font-semibold truncate">
          {app.displayName}
        </span>
        {app.description && (
          <span className="block text-[13px] text-muted-foreground truncate">
            {markdownToPlainText(app.description)}
          </span>
        )}
      </span>
      {showNew && (
        <span className="text-[11px] font-bold text-[#65a443] bg-[#65a443]/12 rounded-full px-2.5 py-0.5">
          New
        </span>
      )}
      {typeLabel(app.type) && (
        <span className="text-[12px] text-muted-foreground bg-muted rounded-full px-2.5 py-0.5 whitespace-nowrap">
          {typeLabel(app.type)}
        </span>
      )}
      <LaunchButton app={app} onLaunch={onLaunch} className="size-8" />
    </button>
  )
}

/** Matched sub-resources listed under a parent before the "… N more" row. */
const COLLAPSED_SUB_LIMIT = 5

/** One line in the flat, keyboard-navigable results list. */
type ResultRow =
  | { kind: 'app'; key: string; app: Resource }
  | { kind: 'sub'; key: string; sub: Resource; parent: Resource }
  | { kind: 'more'; key: string; parent: Resource; hidden: number }

/**
 * Keyboard-navigable search results list — the launcher's only search surface.
 *
 * It renders directly BELOW the hero search box, inside the same persistent
 * launcher shell: the hero copy, the search input and the page container never
 * move when the user types, and no filter chrome (tabs / category / deprecated
 * toggle) appears. Those filters live in the browse view only — clearing the
 * search brings them back.
 *
 * Rows are flat and individually clickable. A matched sub-resource gets its own
 * indented row under its parent, so a query that only hits a sub-resource
 * (e.g. a cloud account) can be opened directly instead of forcing the user to
 * dig through the parent's detail. ↑↓ moves over every row, ↵ activates the
 * focused one, Esc clears the search.
 */
function SearchResultsList({
  apps,
  searchValue,
  onAppClick,
  onSubClick,
  onLaunch,
  onClear,
  keyboardEnabled = true,
  selectedSubSlug,
}: {
  apps: Resource[]
  searchValue: string
  onAppClick: (app: Resource) => void
  onSubClick?: (parentSlug: string, subSlug: string) => void
  onLaunch: (app: Resource) => void
  onClear: () => void
  keyboardEnabled?: boolean
  selectedSubSlug?: string
}) {
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [expandedParents, setExpandedParents] = useState<Set<string>>(
    () => new Set(),
  )

  const results = useMemo(
    () => searchResources(apps, searchValue),
    [apps, searchValue],
  )

  // For each result, the child/sub-resources of it that themselves match the
  // query — so a parent surfaced only via its children (e.g. AWS Console via a
  // "biom" account) tells the user WHICH sub-resources matched, instead of an
  // unexplained parent. Keyed by parent slug.
  const matchedChildrenByParent = useMemo(() => {
    const q = searchValue.trim().toLowerCase()
    const map = new Map<string, Resource[]>()
    if (!q) return map
    const resultSlugs = new Set(results.map((r) => r.slug))
    for (const r of apps) {
      if (!r.parentSlug || !resultSlugs.has(r.parentSlug)) continue
      const hay = `${r.displayName} ${r.abbreviation ?? ''} ${(
        r.aliases ?? []
      ).join(' ')} ${r.description ?? ''}`.toLowerCase()
      if (!hay.includes(q)) continue
      const list = map.get(r.parentSlug) ?? []
      list.push(r)
      map.set(r.parentSlug, list)
    }
    return map
  }, [apps, results, searchValue])

  // #11 deprecated fallback: when EVERY match is a deprecated app (i.e. there
  // are no active matches for the query, only deprecated ones), surface a
  // notice so the user understands why they're seeing archived tools. The
  // deprecated apps are already in `results` because the launcher feeds search
  // the full resource set; this just labels the situation.
  const didDeprecatedFallback = useMemo(
    () => results.length > 0 && results.every((r) => Boolean(r.deprecated)),
    [results],
  )

  // Flatten parents + their matched sub-resources into one navigable list, so a
  // sub-resource row is a first-class result (clickable, focusable) rather than
  // a footnote on its parent.
  const rows = useMemo(() => {
    const out: ResultRow[] = []
    for (const app of results) {
      out.push({ kind: 'app', key: `app:${app.slug}`, app })
      const kids = matchedChildrenByParent.get(app.slug) ?? []
      const expanded = expandedParents.has(app.slug)
      const visible = expanded ? kids : kids.slice(0, COLLAPSED_SUB_LIMIT)
      for (const sub of visible) {
        out.push({
          kind: 'sub',
          key: `sub:${app.slug}:${sub.slug}`,
          sub,
          parent: app,
        })
      }
      const hidden = kids.length - visible.length
      if (hidden > 0) {
        out.push({ kind: 'more', key: `more:${app.slug}`, parent: app, hidden })
      }
    }
    return out
  }, [results, matchedChildrenByParent, expandedParents])

  const activateRow = useCallback(
    (row: ResultRow) => {
      if (row.kind === 'app') {
        onAppClick(row.app)
      } else if (row.kind === 'sub') {
        // Prefer the parent+`?sub=` route so the sub-resource opens with its
        // parent's context (two-step access, back-to-parent).
        if (onSubClick) onSubClick(row.parent.slug, row.sub.slug)
        else onAppClick(row.sub)
      } else {
        setExpandedParents((prev) => new Set(prev).add(row.parent.slug))
      }
    },
    [onAppClick, onSubClick],
  )

  // Reset focus and collapse expanded sub-resource lists when the query changes
  useEffect(() => {
    setFocusedIndex(-1)
    setExpandedParents(new Set())
  }, [searchValue])

  useEffect(() => {
    // While a detail overlay is open it owns the keyboard: without this guard
    // Esc would clear the search behind the overlay and ↑↓/↵ would navigate to
    // a different app from a list the user cannot see.
    if (!keyboardEnabled) return
    const onKey = (e: KeyboardEvent) => {
      if (rows.length === 0) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex((i) => Math.min(i + 1, rows.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        const row = focusedIndex >= 0 ? rows[focusedIndex] : undefined
        if (row) activateRow(row)
      } else if (e.key === 'Escape') {
        onClear()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [rows, focusedIndex, activateRow, onClear, keyboardEnabled])

  return (
    <div className="max-w-[620px] mx-auto mt-3">
      {/* Meta line */}
      <div className="text-[13px] text-muted-foreground mb-2 px-1">
        {results.length === 0
          ? `No results for "${searchValue}"`
          : `${results.length} result${results.length === 1 ? '' : 's'}`}
      </div>

      {/* #11: deprecated-only fallback notice */}
      {didDeprecatedFallback && (
        <div
          role="status"
          className="text-[13px] text-muted-foreground mb-2 px-1"
        >
          No active apps for &quot;{searchValue}&quot; — showing deprecated
          matches.
        </div>
      )}

      {/* Results — parents and their matched sub-resources as one flat list */}
      <div
        className="flex flex-col gap-1.5"
        role="listbox"
        aria-label="Search results"
      >
        {rows.map((row, i) => {
          const focused = focusedIndex === i

          if (row.kind === 'sub') {
            const { sub, parent } = row
            const isOpen = selectedSubSlug === sub.slug
            return (
              <button
                key={row.key}
                type="button"
                role="option"
                aria-selected={focused}
                aria-label={`${sub.displayName} — sub-resource of ${parent.displayName}`}
                title={sub.displayName}
                onMouseEnter={() => setFocusedIndex(i)}
                onClick={() => activateRow(row)}
                className={cn(
                  // Indented + left rule so the parent/child relation reads at
                  // a glance without an extra text prefix.
                  'flex items-center ml-8 border-l-2 pl-3 pr-3 py-1.5 text-left',
                  'text-[13px] rounded-r-[var(--radius)] transition-colors',
                  focused || isOpen
                    ? 'border-primary bg-muted/40 text-foreground'
                    : 'border-border text-muted-foreground hover:border-primary hover:bg-muted/30 hover:text-foreground',
                )}
              >
                <Highlight text={sub.displayName} query={searchValue} />
              </button>
            )
          }

          if (row.kind === 'more') {
            return (
              <button
                key={row.key}
                type="button"
                role="option"
                aria-selected={focused}
                aria-label={`Show ${row.hidden} more matching sub-resources of ${row.parent.displayName}`}
                onMouseEnter={() => setFocusedIndex(i)}
                onClick={() => activateRow(row)}
                className={cn(
                  'flex items-center ml-8 border-l-2 pl-3 pr-3 py-1.5 text-left',
                  'text-[13px] rounded-r-[var(--radius)] transition-colors',
                  focused
                    ? 'border-primary bg-muted/40 text-foreground'
                    : 'border-border text-muted-foreground hover:border-primary hover:text-foreground',
                )}
              >
                ... {row.hidden} more
              </button>
            )
          }

          const app = row.app
          return (
            <button
              key={row.key}
              type="button"
              role="option"
              title={`View ${app.displayName}`}
              aria-selected={focused}
              onMouseEnter={() => setFocusedIndex(i)}
              onClick={() => activateRow(row)}
              className={cn(
                'group flex items-center gap-3.5 w-full text-left',
                'bg-card border rounded-[var(--radius)] px-3.5 py-2.5',
                'transition-all',
                focused
                  ? 'border-ring shadow-sm bg-muted/30'
                  : 'border-border hover:border-ring hover:shadow-sm',
              )}
            >
              <ResourceIcon app={app} size={40} />
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] font-semibold truncate">
                  <Highlight text={app.displayName} query={searchValue} />
                  {app.abbreviation && app.abbreviation !== app.displayName && (
                    <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">
                      (<Highlight text={app.abbreviation} query={searchValue} />
                      )
                    </span>
                  )}
                </span>
                {app.description && (
                  <span className="block text-[12.5px] text-muted-foreground truncate">
                    {markdownToPlainText(app.description)}
                  </span>
                )}
              </span>
              {typeLabel(app.type) && (
                <span className="text-[11.5px] text-muted-foreground bg-muted rounded-full px-2.5 py-0.5 whitespace-nowrap shrink-0">
                  {typeLabel(app.type)}
                </span>
              )}
              <LaunchButton
                app={app}
                onLaunch={onLaunch}
                className="size-7 shrink-0 opacity-0 group-hover:opacity-100"
              />
            </button>
          )
        })}
      </div>

      {/* Keyboard hint */}
      {rows.length > 0 && (
        <p className="text-[11.5px] text-muted-foreground/60 text-center mt-3">
          ↑↓ navigate · ↵ view access · esc clear
        </p>
      )}
    </div>
  )
}

export function LauncherHome({
  apps,
  allResources,
  searchValue,
  onSearchChange,
  onAppClick,
  onSubClick,
  onLaunch,
  totalCount,
  detailOpen = false,
  selectedSubSlug,
}: LauncherHomeProps) {
  const { getTopApps } = useAppClickHistory()
  const [topSlugs, setTopSlugs] = useState<string[]>([])

  useEffect(() => {
    void getTopApps(5).then(setTopSlugs)
  }, [getTopApps])

  const bySlug = useMemo(() => {
    const m = new Map<string, Resource>()
    for (const a of apps) m.set(a.slug, a)
    return m
  }, [apps])

  // Your apps: frequently-clicked (personalized). Empty on a cold new machine.
  const frequent = useMemo(
    () =>
      topSlugs
        .map((s) => bySlug.get(s))
        .filter((a): a is Resource => Boolean(a))
        .slice(0, 5),
    [topSlugs, bySlug],
  )

  // New this week: apps whose content actually changed in the last 7 days, as a
  // proxy for "recently added/updated" (frontend Resource has no createdAt yet;
  // see #38). A bare re-check is not an update, so prefer the content-change
  // date, falling back to the check date only for entries that predate it.
  // Falls back to empty (section hidden) when no freshness data.
  const fresh = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const updatedAt = (a: Resource) =>
      a.freshness?.lastContentChangeAt ?? a.freshness?.lastCheckedAt ?? null
    return apps
      .filter((a) => {
        const t = updatedAt(a)
        return t ? new Date(t).getTime() >= weekAgo : false
      })
      .sort(
        (a, b) =>
          new Date(updatedAt(b) ?? 0).getTime() -
          new Date(updatedAt(a) ?? 0).getTime(),
      )
      .slice(0, 6)
  }, [apps])

  // Browse all: everything not already promoted to "Your apps", alpha by name.
  const browse = useMemo(() => {
    const promoted = new Set(frequent.map((a) => a.slug))
    return [...apps]
      .filter((a) => !promoted.has(a.slug))
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
  }, [apps, frequent])

  const browseLeft = browse.filter((_, i) => i % 2 === 0)
  const browseRight = browse.filter((_, i) => i % 2 === 1)

  const isSearching = searchValue.trim() !== ''
  const searchRef = useRef<HTMLInputElement>(null)

  // ⌘K / Ctrl+K focuses the hero search box from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="mx-auto w-full max-w-[1000px] pb-24">
      {/* hero */}
      <div className="text-center pt-10 pb-1.5">
        <h1 className="font-serif font-semibold text-[30px] tracking-tight m-0 mb-1.5">
          What do you need to get into?
        </h1>
        <p className="text-muted-foreground m-0 mb-6 text-[15px]">
          Find any tool, see how to request access, or jump straight in.
        </p>
        <div className="max-w-[620px] mx-auto">
          <div className="flex items-center gap-3 bg-card border-[1.5px] border-input rounded-full px-5 h-14 shadow-sm focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15 transition-colors">
            <Search className="size-5 shrink-0 text-muted-foreground" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search apps, databases, cloud accounts, account IDs…"
              autoComplete="off"
              autoFocus
              ref={searchRef}
              aria-label="Search apps"
              className="flex-1 bg-transparent border-0 outline-none text-[16px] text-foreground placeholder:text-muted-foreground"
            />
            {isSearching ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  onSearchChange('')
                  searchRef.current?.focus()
                }}
                className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <X className="size-4" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[11px] text-muted-foreground/60 border border-muted-foreground/20 rounded px-1.5 py-0.5 font-mono shrink-0">
                {typeof navigator !== 'undefined' &&
                navigator.platform.includes('Mac')
                  ? '⌘K'
                  : 'Ctrl+K'}
              </kbd>
            )}
          </div>
        </div>
      </div>

      {/* Search results: rendered in place, directly under the (unmoved) hero
          search box. The discovery spine below is what gets replaced — the
          shell, hero and search box stay put, so typing never shifts layout. */}
      {isSearching && (
        <SearchResultsList
          apps={allResources ?? apps}
          searchValue={searchValue}
          onAppClick={onAppClick}
          onSubClick={onSubClick}
          onLaunch={onLaunch}
          onClear={() => onSearchChange('')}
          keyboardEnabled={!detailOpen}
          selectedSubSlug={selectedSubSlug}
        />
      )}

      {/* Discovery spine: only shown when not searching */}
      {!isSearching && (
        <>
          {/* Your apps */}
          {frequent.length > 0 && (
            <section className="mt-9">
              <SectionHead title="Your apps" count="frequent" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
                {frequent.map((app) => (
                  <button
                    type="button"
                    key={app.slug}
                    onClick={() => onAppClick(app)}
                    title={`View ${app.displayName}`}
                    className="group relative bg-card border border-border rounded-[var(--radius)] px-3.5 pt-[18px] pb-4 text-center shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all"
                  >
                    <LaunchButton
                      app={app}
                      onLaunch={onLaunch}
                      className="absolute top-2.5 right-2.5 size-[26px] opacity-0 group-hover:opacity-100"
                    />
                    <ResourceIcon
                      app={app}
                      size={46}
                      className="mx-auto mb-3"
                    />
                    <span className="block text-[13.5px] font-bold truncate">
                      {app.displayName}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* New this week */}
          {fresh.length > 0 && (
            <section className="mt-9">
              <SectionHead
                title="New this week"
                count={`${fresh.length} added`}
              />
              <div className="flex flex-col gap-2">
                {fresh.map((app) => (
                  <ResourceRow
                    key={app.slug}
                    app={app}
                    onAppClick={onAppClick}
                    onLaunch={onLaunch}
                    showNew
                  />
                ))}
              </div>
            </section>
          )}

          {/* Browse all */}
          <section className="mt-9">
            <SectionHead title="Browse all" count={`${totalCount} resources`} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                {browseLeft.map((app) => (
                  <ResourceRow
                    key={app.slug}
                    app={app}
                    onAppClick={onAppClick}
                    onLaunch={onLaunch}
                  />
                ))}
              </div>
              <div className="flex flex-col gap-2">
                {browseRight.map((app) => (
                  <ResourceRow
                    key={app.slug}
                    app={app}
                    onAppClick={onAppClick}
                    onLaunch={onLaunch}
                  />
                ))}
              </div>
            </div>
          </section>

          <AttributionFooter />
        </>
      )}
    </div>
  )
}
