import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Search, X } from 'lucide-react'
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTRPC } from '~/api/infra/trpc'
import { cn } from '~/lib/utils'
import { useAppCatalogContext } from '../../context/AppCatalogContext'
import { DeskCard, ServiceDeskCard } from '../serviceDesks/ServiceDeskCard'
import { ServiceDeskDetail } from '../serviceDesks/ServiceDeskDetail'
import {
  effectiveQuery,
  hasPortal,
  searchServiceDesks,
} from '../serviceDesks/searchServiceDesks'
import type { ServiceDesk } from '../serviceDesks/searchServiceDesks'

/** Results rendered before "Show more": a one-letter query matches hundreds. */
const FIRST_PAGE = 50

/** Where desks with no area, or no portal at all, are listed. */
const OTHER_AREA = 'Other ways to ask'

/**
 * Service Desks view (#9, #273): one search over every service desk — its key,
 * name, description, request forms and their dropdown options. A result is a
 * form; the card opens the desk's details, the form's address opens the portal.
 * With no search, every desk is listed by area, like the catalog's own home.
 *
 * The desks' portals come from `getServiceDesks`, kept out of the main catalog
 * payload. Until it answers, the catalog's own (portal-less) desks are listed.
 */
export function ServiceDesksPage() {
  const trpc = useTRPC()
  const { approvalMethods } = useAppCatalogContext()
  const fetched = useQuery(trpc.appCatalog.getServiceDesks.queryOptions())
  const [search, setSearch] = useState('')
  const [shown, setShown] = useState(FIRST_PAGE)
  // The open card lives in the URL, so Back closes it and a link reopens it.
  const { desk: openSlug, form: openFormId } = useSearch({ strict: false })
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  /**
   * Same split as the catalog search: the box commits each character at once,
   * and everything below re-renders from this value at low priority, abandoned
   * when the next key arrives. The cards are memoized, so a pass that does run
   * only touches the cards that changed.
   */
  const deferredSearch = useDeferredValue(search)
  const isPending = search !== deferredSearch
  const isSearching = deferredSearch.trim() !== ''

  const desks: ServiceDesk[] = useMemo(
    () =>
      [
        ...(fetched.data ??
          approvalMethods.filter(
            (m): m is ServiceDesk => m.type === 'service',
          )),
      ].sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [fetched.data, approvalMethods],
  )
  const portalDesks = useMemo(() => desks.filter(hasPortal), [desks])

  const { query, results } = useMemo(() => {
    // The query as typed is searched once; a reread runs only when it finds nothing.
    const asTyped = searchServiceDesks(portalDesks, deferredSearch)
    if (asTyped.length) return { query: deferredSearch, results: asTyped }
    const reread = effectiveQuery(
      deferredSearch,
      (alt) => searchServiceDesks(portalDesks, alt).length > 0,
    )
    return {
      query: reread,
      results:
        reread === deferredSearch
          ? asTyped
          : searchServiceDesks(portalDesks, reread),
    }
  }, [portalDesks, deferredSearch])

  // Desks found by name or description that publish no forms: links only.
  const plainHits = useMemo(() => {
    if (!isSearching) return []
    const q = query.trim().toLowerCase()
    return desks.filter(
      (d) =>
        !hasPortal(d) &&
        `${d.displayName} ${d.config.description ?? ''}`
          .toLowerCase()
          .includes(q),
    )
  }, [desks, isSearching, query])

  const areas = useMemo(() => groupByArea(desks), [desks])

  const onOpen = useCallback(
    (slug: string, formId?: string) =>
      void navigate({
        to: '/service-desks',
        search: (prev) => ({
          ...prev,
          desk: slug,
          form: formId && /^\d+$/.test(formId) ? Number(formId) : formId,
          tab: undefined,
        }),
      }),
    [navigate],
  )
  const onClose = () =>
    void navigate({
      to: '/service-desks',
      search: (prev) => ({
        ...prev,
        desk: undefined,
        form: undefined,
        tab: undefined,
      }),
    })
  const openDesk = openSlug
    ? portalDesks.find((d) => d.slug === openSlug)
    : undefined
  const openForm = openDesk?.config.portal.requestTypes.find(
    (f) => openFormId !== undefined && f.id === String(openFormId),
  )
  const deskCount = new Set(results.map((r) => r.desk.slug)).size

  const updateSearch = (value: string) => {
    setSearch(value)
    setShown(FIRST_PAGE)
  }
  const clear = () => {
    updateSearch('')
    inputRef.current?.focus()
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 min-h-0 overflow-y-auto [scrollbar-gutter:stable] pb-24"
    >
      <div className="mx-auto w-full max-w-[1000px]">
        <div className="pb-1.5 pt-10 text-center">
          <h1 className="m-0 mb-1.5 font-serif text-[30px] font-semibold tracking-tight">
            Where do I file this?
          </h1>
          <p className="m-0 mb-6 text-[15px] text-muted-foreground">
            Search every service desk by its name, key, forms and the options
            those forms offer.
          </p>
          <div className="mx-auto max-w-[620px]">
            <div className="flex h-14 items-center gap-3 rounded-full border-[1.5px] border-input bg-card px-5 shadow-sm transition-colors focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15">
              <Search className="size-5 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                autoFocus
                value={search}
                onChange={(e) => updateSearch(e.target.value)}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === 'Escape' && search) {
                    e.preventDefault()
                    clear()
                  }
                }}
                placeholder="Database access, a broken laptop, or a desk key"
                aria-label="Search service desks"
                className="flex-1 border-0 bg-transparent text-[16px] text-foreground outline-none placeholder:text-muted-foreground"
              />
              {search && (
                <button
                  type="button"
                  onClick={clear}
                  aria-label="Clear search"
                  title="Clear search (Esc)"
                  className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div
          className={cn(
            'mt-8 transition-opacity',
            // A render behind the box: dimmed so stale rows read as stale.
            isPending && 'opacity-60',
          )}
        >
          {isSearching ? (
            <div className="mx-auto max-w-[820px]">
              <p
                className="mb-3 px-1 text-[14px] text-muted-foreground"
                aria-live="polite"
              >
                {query !== deferredSearch && (
                  <>
                    Showing results for{' '}
                    <b className="text-foreground">{query}</b>.{' '}
                  </>
                )}
                {results.length
                  ? `${results.length} form${results.length === 1 ? '' : 's'} at ${deskCount} desk${deskCount === 1 ? '' : 's'}`
                  : plainHits.length
                    ? ''
                    : `No desk or form mentions “${deferredSearch}”. Try one word.`}
              </p>
              <ol className="flex flex-col gap-3">
                {results.slice(0, shown).map((r) => (
                  <ServiceDeskCard
                    key={`${r.desk.slug}:${r.form.id}`}
                    result={r}
                    query={query}
                    onOpen={onOpen}
                  />
                ))}
              </ol>
              {results.length > shown && (
                <button
                  type="button"
                  onClick={() => setShown(shown + FIRST_PAGE)}
                  className="mx-auto mt-4 block rounded-full border border-border bg-card px-4 py-2 text-[14px] font-semibold transition-colors hover:border-ring"
                >
                  Show {Math.min(FIRST_PAGE, results.length - shown)} more of{' '}
                  {results.length - shown}
                </button>
              )}
              {plainHits.length > 0 && (
                <section className="mt-8">
                  <h2 className="m-0 mb-3 px-1 font-serif text-[15px] font-semibold tracking-tight">
                    Other desks
                  </h2>
                  <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {plainHits.map((d) => (
                      <DeskCard key={d.slug} desk={d} onOpen={onOpen} />
                    ))}
                  </ul>
                </section>
              )}
            </div>
          ) : (
            <AreaBrowse areas={areas} onOpen={onOpen} scrollRef={scrollRef} />
          )}
        </div>
      </div>

      {openDesk && (
        <ServiceDeskDetail desk={openDesk} form={openForm} onClose={onClose} />
      )}
    </div>
  )
}

const areaId = (area: string) =>
  `area-${area.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

/**
 * Every desk by area, with a contents list beside it on wide screens. The list
 * scrolls the page to an area and marks the one being read.
 */
function AreaBrowse({
  areas,
  onOpen,
  scrollRef,
}: {
  areas: [string, ServiceDesk[]][]
  onOpen: (slug: string) => void
  scrollRef: React.RefObject<HTMLDivElement | null>
}) {
  const [current, setCurrent] = useState(areas[0]?.[0])
  useEffect(() => {
    const root = scrollRef.current
    if (!root) return
    // The current area is the last one whose heading has scrolled past the
    // top: a rule that never depends on how tall the section above it is.
    let frame = 0
    const update = () => {
      frame = 0
      const line = root.getBoundingClientRect().top + 120
      let last = areas[0]?.[0]
      for (const el of root.querySelectorAll<HTMLElement>('[data-area]')) {
        if (el.getBoundingClientRect().top <= line) last = el.dataset.area
      }
      // At the bottom nothing below can reach the line: the last area wins.
      if (root.scrollTop + root.clientHeight >= root.scrollHeight - 4) {
        last = areas[areas.length - 1]?.[0]
      }
      setCurrent(last)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    root.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      root.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [areas, scrollRef])

  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_200px] xl:gap-10">
      <div>
        {areas.map(([area, list]) => (
          <section
            key={area}
            id={areaId(area)}
            data-area={area}
            className="mt-11 first:mt-2"
          >
            <div className="mb-4 flex items-center gap-2.5">
              <div className="h-[3px] w-11 rounded-full bg-primary" />
              <h2 className="m-0 font-serif text-[27px] font-semibold leading-tight tracking-tight">
                {area}
              </h2>
              <span className="text-[13px] text-muted-foreground">
                {list.length} {list.length === 1 ? 'desk' : 'desks'}
              </span>
            </div>
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {list.map((d) => (
                <DeskCard
                  key={d.slug}
                  desk={d}
                  onOpen={onOpen}
                  showArea={false}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
      <nav aria-label="Areas" className="hidden xl:block">
        <ol className="sticky top-4 mt-2 flex flex-col border-l border-border">
          {areas.map(([area, list]) => {
            const active = area === current
            return (
              <li key={area}>
                <a
                  href={`#${areaId(area)}`}
                  aria-current={active ? 'true' : undefined}
                  onClick={(e) => {
                    e.preventDefault()
                    // Scrolls this view only: scrollIntoView would also move
                    // the document and push the header band off screen.
                    const root = scrollRef.current
                    const el = document.getElementById(areaId(area))
                    if (!root || !el) return
                    root.scrollTo({
                      top:
                        root.scrollTop +
                        el.getBoundingClientRect().top -
                        root.getBoundingClientRect().top -
                        16,
                      behavior: 'smooth',
                    })
                  }}
                  className={cn(
                    '-ml-px flex items-baseline justify-between gap-2 border-l-2 py-1.5 pl-3 text-[13px] leading-snug transition-colors',
                    active
                      ? 'border-primary font-semibold text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span>{area}</span>
                  <span className="tabular-nums text-[12px] text-muted-foreground">
                    {list.length}
                  </span>
                </a>
              </li>
            )
          })}
        </ol>
      </nav>
    </div>
  )
}

/**
 * Desks by their portal's area, areas A to Z, desks A to Z inside one. Desks
 * with no area — chat bots, web forms, portals nobody has placed yet — go last.
 */
function groupByArea(desks: ServiceDesk[]): [string, ServiceDesk[]][] {
  const byArea = new Map<string, ServiceDesk[]>()
  for (const d of desks) {
    const area = (hasPortal(d) && d.config.portal.area) || OTHER_AREA
    byArea.set(area, [...(byArea.get(area) ?? []), d])
  }
  return [...byArea.entries()].sort(([a], [b]) =>
    a === OTHER_AREA ? 1 : b === OTHER_AREA ? -1 : a.localeCompare(b),
  )
}
