import type {
  CommunityTool,
  FeedWindow,
  MatchField,
} from '@igstack/app-catalog-shared-core'
import { matchTool, rankTools } from '@igstack/app-catalog-shared-core'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { useVirtualizer } from '@tanstack/react-virtual'
import { AlertTriangle, Plus, RefreshCw, Search, Star } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useAuthModal } from '~/modules/auth/AuthModalContext'
import { Skeleton } from '~/ui/skeleton'
import { useCommunityTools } from '../useCommunityTools'
import { FeedRow } from './FeedRow'
import { FeedWindowToggle } from './FeedWindowToggle'
import { MyToolsShelf } from './MyToolsShelf'
import { RecentChips } from './RecentChips'
import { TagRow } from './TagRow'
import { Toast } from './Toast'
import type { ToastMessage } from './Toast'
import { ToolCard } from './ToolCard'
import { ToolFormDialog } from './ToolFormDialog'
import { ToolSearch } from './ToolSearch'

const KBD =
  'rounded-[5px] border border-b-2 border-border bg-card px-1.5 py-px text-[11px] font-semibold text-muted-foreground'

interface ListItem {
  tool: CommunityTool
  matched?: MatchField[]
}

export interface CommunityPageProps {
  /** `?tag=`: `<kind>:<value>`, or none for the whole feed. */
  tag: string | undefined
  feedWindow: FeedWindow
  onTagChange: (tag: string | undefined) => void
  onWindowChange: (feedWindow: FeedWindow) => void
  /** The tool whose card is open over the page (`/community/<slug>`). */
  cardSlug?: string
}

const RESULTS_ID = 'community-results-grid'

/** Stable per tool, so the active descendant survives re-renders and re-ranking. */
function optionIdOf(slug: string): string {
  return `community-option-${slug}`
}

function openSite(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

export function CommunityPage({
  tag,
  feedWindow,
  onTagChange,
  onWindowChange,
  cardSlug,
}: CommunityPageProps) {
  const {
    list,
    pins,
    recent,
    appNames,
    isAuthenticated,
    isAuthLoading,
    pin,
    unpin,
    pinBusySlug,
    reorder,
  } = useCommunityTools()
  const { open: openSignIn } = useAuthModal()
  const navigate = useNavigate()
  // Signing in comes back here: this page, or the card open over it. The
  // router's own location, so it holds under any history (and in tests).
  const here = useLocation({ select: (l) => l.href })
  const signInHere = () => openSignIn(here)

  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const tokens = useMemo(
    () => query.trim().toLowerCase().split(/\s+/).filter(Boolean),
    [query],
  )
  const searching = tokens.length > 0

  const [toast, setToast] = useState<ToastMessage | null>(null)
  const toastIdRef = useRef(0)
  const showToast = useCallback((message: Omit<ToastMessage, 'id'>) => {
    toastIdRef.current += 1
    setToast({ ...message, id: toastIdRef.current })
  }, [])
  const dismissToast = useCallback(() => setToast(null), [])

  const tools = useMemo(() => list.data ?? [], [list.data])
  const withTag = useCallback(
    (all: CommunityTool[]) =>
      tag
        ? all.filter((t) => t.tags.some((g) => `${g.kind}:${g.value}` === tag))
        : all,
    [tag],
  )

  const feed = useMemo<ListItem[]>(
    () => withTag(rankTools(tools, feedWindow)).map((tool) => ({ tool })),
    [tools, feedWindow, withTag],
  )

  // Archived tools leave the feed, but someone searching for one still finds
  // it: after every live match, greyed.
  const results = useMemo<ListItem[]>(() => {
    if (!searching) return []
    const hits = new Map<string, MatchField[]>()
    for (const tool of withTag(tools)) {
      const match = matchTool(tool, query, appNames)
      if (match.matched) hits.set(tool.slug, match.fields)
    }
    const hit = tools.filter((t) => hits.has(t.slug))
    const archived = hit
      .filter((t) => t.lifecycle.state === 'archived')
      .sort((a, b) => a.name.localeCompare(b.name))
    return [...rankTools(hit, feedWindow), ...archived].map((tool) => ({
      tool,
      matched: hits.get(tool.slug),
    }))
  }, [searching, tools, query, appNames, feedWindow, withTag])

  const items = searching ? results : feed
  const selectedIndex = Math.min(selected, results.length - 1)
  const selectedTool = results[selectedIndex]?.tool
  const activeOptionId =
    searching && selectedTool ? optionIdOf(selectedTool.slug) : undefined

  const pinnedSlugs = useMemo(
    () => new Set((pins.data ?? []).map((t) => t.slug)),
    [pins.data],
  )

  const pinError = (retry: () => void) => () =>
    showToast({
      tone: 'error',
      text: 'Could not save the pin. Check your connection.',
      action: { label: 'Try again', run: retry },
    })

  const pinTool = (slug: string) =>
    pin.mutate(
      { slug },
      {
        onSuccess: () =>
          showToast({
            tone: 'info',
            text: 'Pinned to My tools',
            action: { label: 'Undo', run: () => unpinTool(slug, false) },
          }),
        onError: pinError(() => pinTool(slug)),
      },
    )
  const unpinTool = (slug: string, offerUndo = true) =>
    unpin.mutate(
      { slug },
      {
        onSuccess: () => {
          if (offerUndo) {
            showToast({
              tone: 'info',
              text: 'Removed from My tools',
              action: { label: 'Undo', run: () => pinTool(slug) },
            })
          }
        },
        onError: pinError(() => unpinTool(slug, offerUndo)),
      },
    )
  const togglePin = (tool: CommunityTool) => {
    if (!isAuthenticated) {
      signInHere()
      return
    }
    if (pinnedSlugs.has(tool.slug)) unpinTool(tool.slug)
    else pinTool(tool.slug)
  }

  // A failed save puts the tiles back (the pins refetch); say why they moved.
  const reorderPins = (slugs: string[]) =>
    reorder.mutate(
      { slugs },
      {
        onError: () =>
          showToast({
            tone: 'error',
            text: "Couldn't save the new order",
            action: { label: 'Try again', run: () => reorderPins(slugs) },
          }),
      },
    )

  // Open: `{}` from Add a tool, the search text from "Add it".
  const [adding, setAdding] = useState<{ prefillName?: string } | null>(null)
  const startAdd = (prefillName?: string) => {
    // Adding needs an identity: sign in, then come back to this page.
    if (!isAuthenticated) signInHere()
    else setAdding({ prefillName })
  }

  const openCard = (slug: string, replace = false) =>
    navigate({
      to: '/community/$slug',
      params: { slug },
      search: (prev) => prev,
      replace,
    })
  const closeCard = () =>
    void navigate({ to: '/community', search: (prev) => prev })

  // The page column scrolls (the layout pins the header), not the list: the
  // virtualizer needs where the list starts inside that column. Everything
  // above it can change height — the shelf loads, hides while searching, goes
  // from 2 to 4 columns at `md` — and all of that resizes the page, so one
  // observer on it catches each case.
  const scrollRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const [listEl, setListEl] = useState<HTMLDivElement | null>(null)
  const [scrollMargin, setScrollMargin] = useState(0)
  useEffect(() => {
    const scroller = scrollRef.current
    const page = pageRef.current
    if (!scroller || !page || !listEl) return
    const measure = () =>
      setScrollMargin(
        listEl.getBoundingClientRect().top -
          scroller.getBoundingClientRect().top +
          scroller.scrollTop,
      )
    const observer = new ResizeObserver(measure)
    observer.observe(page)
    measure()
    return () => observer.disconnect()
  }, [listEl])
  // No layout, no window (jsdom, a print preview): the column measures 0 tall,
  // a virtualizer mounts nothing, so every row is rendered instead.
  const [hasLayout, setHasLayout] = useState(true)
  useLayoutEffect(() => {
    setHasLayout((scrollRef.current?.clientHeight ?? 0) > 0)
  }, [])
  // Stable on purpose: the virtualizer keys its measurement cache on this
  // function's identity, so a new arrow every render re-renders forever.
  const getItemKey = useCallback(
    (i: number) => items[i]?.tool.slug ?? i,
    [items],
  )
  // TanStack Virtual hands back functions the React Compiler cannot memoize
  // safely, so it skips this hook; registered in the root eslint.config.js.
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual
  const virtualizer = useVirtualizer({
    getScrollElement: () => scrollRef.current,
    // The column's height before it is measured, so the first paint already
    // holds the rows that will be visible.
    initialRect: { width: 0, height: 800 },
    count: items.length,
    estimateSize: () => 112,
    overscan: 6,
    gap: 8,
    scrollMargin,
    getItemKey,
  })

  // Keep the selected result on screen. The next row is almost always already
  // mounted (overscan), and the browser scrolls it exactly; the virtualizer's
  // own estimate-based scroll is only for a row that is not there yet.
  useEffect(() => {
    if (!searching || selectedIndex < 0) return
    const row = listEl?.querySelector(`[data-index="${selectedIndex}"]`)
    if (row) row.scrollIntoView({ block: 'nearest' })
    else virtualizer.scrollToIndex(selectedIndex, { align: 'auto' })
  }, [searching, selectedIndex, virtualizer, listEl])

  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const current = results[selectedIndex]
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (results.length === 0) return
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      setSelected(
        Math.min(results.length - 1, Math.max(0, selectedIndex + step)),
      )
    } else if (e.key === 'Enter' && current) {
      e.preventDefault()
      openSite(current.tool.url)
    } else if (
      e.key === 'ArrowRight' &&
      current &&
      e.currentTarget.selectionStart === e.currentTarget.value.length
    ) {
      // Only at the end of the text, so → still moves the caret inside it.
      e.preventDefault()
      void openCard(current.tool.slug)
    }
  }

  // Without layout every row is "virtual", at its natural place in the flow.
  const virtualItems = hasLayout
    ? virtualizer.getVirtualItems()
    : items.map((_, index) => ({
        key: items[index]!.tool.slug,
        index,
        start: virtualizer.options.scrollMargin,
      }))

  return (
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]"
    >
      <div ref={pageRef} className="mx-auto w-full max-w-[1000px] pt-1.5 pb-10">
        <div className="mb-[22px] flex items-center gap-2.5">
          <ToolSearch
            value={query}
            onChange={(value) => {
              setQuery(value)
              setSelected(0)
            }}
            resultCount={results.length}
            resultsId={searching && results.length > 0 ? RESULTS_ID : undefined}
            activeDescendant={activeOptionId}
            onKey={onSearchKey}
          />
          <button
            type="button"
            onClick={() => startAdd()}
            className="inline-flex h-10 shrink-0 items-center gap-[7px] rounded-[10px] border border-border bg-card px-3.5 text-[13.5px] font-bold whitespace-nowrap hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Plus aria-hidden="true" className="size-4" />
            Add a tool
          </button>
        </div>

        {searching ? (
          <div className="-mt-2 mb-3.5 ml-1 flex items-center gap-2 text-[13px] font-semibold text-muted-foreground">
            <Star
              aria-hidden="true"
              className="size-4 fill-amber-400 text-amber-600"
            />
            My tools and Recently opened are hidden while you search
          </div>
        ) : (
          <div className="mb-[26px]">
            <MyToolsShelf
              pins={pins.data ?? []}
              isLoading={isAuthLoading || pins.isPending}
              onUnpin={(tool) => togglePin(tool)}
              onReorder={reorderPins}
              onSignIn={
                !isAuthLoading && !isAuthenticated ? signInHere : undefined
              }
            />
            {isAuthenticated && <RecentChips tools={recent.data ?? []} />}
          </div>
        )}

        <section
          aria-label={
            searching ? 'Search results' : 'Most opened by colleagues'
          }
          data-testid={searching ? 'community-results' : 'community-feed'}
        >
          {!searching && (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-serif text-[19px] font-semibold">
                  Most opened by colleagues
                </h2>
                <FeedWindowToggle
                  value={feedWindow}
                  onChange={onWindowChange}
                />
              </div>
              <TagRow
                tools={rankTools(tools, feedWindow)}
                activeTag={tag}
                appNames={appNames}
                onChoose={onTagChange}
              />
            </>
          )}

          {list.isPending ? (
            <FeedSkeleton />
          ) : list.isError ? (
            <FeedError onRetry={() => void list.refetch()} />
          ) : searching && results.length === 0 ? (
            <NoResults
              query={query.trim()}
              onAdd={() => startAdd(query.trim())}
            />
          ) : (
            <div
              ref={setListEl}
              id={searching ? RESULTS_ID : undefined}
              role={searching ? 'grid' : undefined}
              aria-label={searching ? 'Search results' : undefined}
              aria-activedescendant={activeOptionId}
              className={hasLayout ? 'relative' : 'flex flex-col gap-2'}
              style={
                hasLayout ? { height: virtualizer.getTotalSize() } : undefined
              }
            >
              {virtualItems.map((row) => {
                const item = items[row.index]
                if (!item) return null
                return (
                  <div
                    key={row.key}
                    data-index={row.index}
                    ref={virtualizer.measureElement}
                    className={
                      hasLayout ? 'absolute inset-x-0 top-0' : undefined
                    }
                    style={
                      hasLayout
                        ? {
                            transform: `translateY(${row.start - virtualizer.options.scrollMargin}px)`,
                          }
                        : undefined
                    }
                  >
                    <FeedRow
                      tool={item.tool}
                      rank={searching ? undefined : row.index + 1}
                      feedWindow={feedWindow}
                      tokens={tokens}
                      matched={item.matched}
                      selected={searching && row.index === selectedIndex}
                      optionId={
                        searching ? optionIdOf(item.tool.slug) : undefined
                      }
                      pinned={pinnedSlugs.has(item.tool.slug)}
                      pinBusy={pinBusySlug === item.tool.slug}
                      appNames={appNames}
                      activeTag={tag}
                      onTogglePin={() => togglePin(item.tool)}
                      onChooseTag={onTagChange}
                    />
                  </div>
                )
              })}
            </div>
          )}

          {searching && results.length > 0 && (
            <div className="mt-3.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-muted-foreground">
              <kbd className={KBD}>↑</kbd>
              <kbd className={KBD}>↓</kbd>
              <span className="mr-2.5">move</span>
              <kbd className={KBD}>Enter</kbd>
              <span className="mr-2.5">open site</span>
              <kbd className={KBD}>→</kbd>
              <span className="mr-2.5">open card</span>
              <kbd className={KBD}>Esc</kbd>
              <span>clear</span>
            </div>
          )}
        </section>

        {cardSlug && (
          <ToolCard
            slug={cardSlug}
            siblings={items.map((item) => item.tool.slug)}
            onClose={closeCard}
            // Stepping swaps the card in place; Back still leaves the card.
            onNavigate={(slug) => void openCard(slug, true)}
            pinned={pinnedSlugs.has(cardSlug)}
            pinBusy={pinBusySlug === cardSlug}
            onTogglePin={togglePin}
            appNames={appNames}
            // One step: the card closes onto the feed already filtered.
            onChooseTag={(chosen) =>
              void navigate({
                to: '/community',
                search: (prev) => ({ ...prev, tag: chosen }),
              })
            }
          />
        )}
        {adding && (
          <ToolFormDialog
            mode="add"
            prefillName={adding.prefillName}
            onClose={() => setAdding(null)}
            onOpenCard={(slug) => {
              setAdding(null)
              void openCard(slug)
            }}
            onDone={(slug) => {
              setAdding(null)
              showToast({
                tone: 'ok',
                text: (
                  <>
                    <b>Live now</b>, in the review list
                  </>
                ),
                action: { label: 'Open card', run: () => void openCard(slug) },
              })
            }}
          />
        )}
        {/* After the card, so a toast raised from it shows above its scrim. */}
        <Toast toast={toast} onDismiss={dismissToast} />
      </div>
    </div>
  )
}

/** Three placeholder rows at the real row height. */
function FeedSkeleton() {
  return (
    <div
      data-testid="feed-skeleton"
      aria-busy="true"
      className="flex flex-col gap-2"
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-[14px] border border-border bg-card py-3 pr-3.5 pl-3"
        >
          <Skeleton className="h-[22px] w-[26px]" />
          <Skeleton className="aspect-[16/10] w-32 rounded-[10px]" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-2.5 w-2/5" />
            <Skeleton className="h-2.5 w-4/5" />
            <Skeleton className="h-2.5 w-1/4" />
          </div>
          <Skeleton className="h-[46px] w-16 rounded-[10px]" />
        </div>
      ))}
    </div>
  )
}

function FeedError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      data-testid="feed-error"
      role="alert"
      className="flex items-center gap-3.5 rounded-[14px] border border-destructive/30 bg-destructive/5 px-5 py-[18px]"
    >
      <AlertTriangle
        aria-hidden="true"
        className="size-[22px] shrink-0 text-destructive"
      />
      <div>
        <b className="font-bold">Could not load community tools.</b>
        <p className="mt-0.5 text-muted-foreground">
          The server did not answer. Your pinned tools above still work.
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="ml-auto inline-flex h-10 shrink-0 items-center gap-[7px] rounded-[10px] border border-border bg-card px-3.5 text-[13.5px] font-bold hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-ring"
      >
        <RefreshCw aria-hidden="true" className="size-4" />
        Try again
      </button>
    </div>
  )
}

function NoResults({ query, onAdd }: { query: string; onAdd: () => void }) {
  return (
    <div
      data-testid="no-results"
      className="flex gap-3.5 rounded-[14px] border border-border bg-card px-5 py-[18px]"
    >
      <Search
        aria-hidden="true"
        className="mt-0.5 size-5 shrink-0 text-muted-foreground"
      />
      <div>
        <b className="font-bold">Nothing matches “{query}”.</b>
        <p className="mt-0.5 text-muted-foreground">
          Try a word from the page itself, or the name of the person who shared
          it. Know the tool?{' '}
          <button
            type="button"
            onClick={onAdd}
            className="font-bold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          >
            Add it
          </button>
        </p>
      </div>
    </div>
  )
}
