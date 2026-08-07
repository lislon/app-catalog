import type { Resource } from '@igstack/app-catalog-backend-core'
import { ArrowUpRight, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { cn } from '~/lib/utils'
import { useAppClickHistory } from '../../hooks/useAppClickHistory'
import { markdownToPlainText } from '../../utils/markdownToPlainText'
import { ResourceIcon } from './ResourceIcon'
import { searchResources } from '../../utils/searchApps'

/**
 * Adaptive-home discovery spine (issue #38, increment 1) — matches the
 * option-a-launcher prototype:
 *   Your apps (frequent) → New this week → Browse all
 * Rendered by AppCatalogPage when there is no active search and no open detail.
 * The hero search box drives the same `searchValue` used elsewhere; typing hands
 * off to the results view (increment 2 refines the morph).
 */

const typeLabel = (t?: string): string => {
  if (!t || t === 'application') return 'App'
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
  onLaunch: (app: Resource) => void
  /** Total resource count for the "Browse all" label. */
  totalCount: number
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
  return (
    <a
      href={app.appUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={`Open ${app.displayName} in a new tab`}
      aria-label={`Open ${app.displayName} in a new tab`}
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
      <span className="text-[12px] text-muted-foreground bg-muted rounded-full px-2.5 py-0.5 whitespace-nowrap">
        {typeLabel(app.type)}
      </span>
      <LaunchButton app={app} onLaunch={onLaunch} className="size-8" />
    </button>
  )
}

/**
 * Keyboard-navigable search results list — increment 2 of the launcher redesign.
 * Appears below the hero search box when the user types, replacing the
 * discovery spine. Pressing ↑↓ navigates, ↵ opens detail, Esc clears.
 */
function SearchResultsList({
  apps,
  searchValue,
  onAppClick,
  onLaunch,
  onClear,
}: {
  apps: Resource[]
  searchValue: string
  onAppClick: (app: Resource) => void
  onLaunch: (app: Resource) => void
  onClear: () => void
}) {
  const [focusedIndex, setFocusedIndex] = useState(-1)

  const results = useMemo(
    () => searchResources(apps, searchValue),
    [apps, searchValue],
  )

  // Reset focus when results change
  useEffect(() => {
    setFocusedIndex(-1)
  }, [searchValue])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (results.length === 0) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex((i) => Math.min(i + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        if (focusedIndex >= 0 && results[focusedIndex]) {
          onAppClick(results[focusedIndex])
        }
      } else if (e.key === 'Escape') {
        onClear()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [results, focusedIndex, onAppClick, onClear])

  return (
    <div className="max-w-[620px] mx-auto mt-3">
      {/* Meta line */}
      <div className="text-[13px] text-muted-foreground mb-2 px-1">
        {results.length === 0
          ? `No results for "${searchValue}"`
          : `${results.length} result${results.length === 1 ? '' : 's'}`}
      </div>

      {/* Results */}
      <div
        className="flex flex-col gap-1.5"
        role="listbox"
        aria-label="Search results"
      >
        {results.map((app, i) => (
          <button
            key={app.slug}
            type="button"
            role="option"
            title={`View ${app.displayName}`}
            aria-selected={focusedIndex === i}
            onMouseEnter={() => setFocusedIndex(i)}
            onClick={() => onAppClick(app)}
            className={cn(
              'group flex items-center gap-3.5 w-full text-left',
              'bg-card border rounded-[var(--radius)] px-3.5 py-2.5',
              'transition-all',
              focusedIndex === i
                ? 'border-ring shadow-sm bg-muted/30'
                : 'border-border hover:border-ring hover:shadow-sm',
            )}
          >
            <ResourceIcon app={app} size={40} />
            <span className="flex-1 min-w-0">
              <span className="block text-[14px] font-semibold truncate">
                {app.displayName}
                {app.abbreviation && app.abbreviation !== app.displayName && (
                  <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">
                    ({app.abbreviation})
                  </span>
                )}
              </span>
              {app.description && (
                <span className="block text-[12.5px] text-muted-foreground truncate">
                  {markdownToPlainText(app.description)}
                </span>
              )}
            </span>
            <span className="text-[11.5px] text-muted-foreground bg-muted rounded-full px-2.5 py-0.5 whitespace-nowrap shrink-0">
              {typeLabel(app.type)}
            </span>
            <LaunchButton
              app={app}
              onLaunch={onLaunch}
              className="size-7 shrink-0 opacity-0 group-hover:opacity-100"
            />
          </button>
        ))}
      </div>

      {/* Keyboard hint */}
      {results.length > 0 && (
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
  onLaunch,
  totalCount,
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

  // New this week: apps whose sources were checked in the last 7 days, as a
  // proxy for "recently added/updated" (frontend Resource has no createdAt yet;
  // see #38). Falls back to empty (section hidden) when no freshness data.
  const fresh = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    return apps
      .filter((a) => {
        const t = a.freshness?.lastCheckedAt
        return t ? new Date(t).getTime() >= weekAgo : false
      })
      .sort((a, b) => {
        const ta = new Date(a.freshness?.lastCheckedAt ?? 0).getTime()
        const tb = new Date(b.freshness?.lastCheckedAt ?? 0).getTime()
        return tb - ta
      })
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
              aria-label="Search apps"
              className="flex-1 bg-transparent border-0 outline-none text-[16px] text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>

      {/* Search morph: when typing, show compact results list instead of the discovery spine */}
      {isSearching && (
        <SearchResultsList
          apps={allResources ?? apps}
          searchValue={searchValue}
          onAppClick={onAppClick}
          onLaunch={onLaunch}
          onClear={() => onSearchChange('')}
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
        </>
      )}
    </div>
  )
}
