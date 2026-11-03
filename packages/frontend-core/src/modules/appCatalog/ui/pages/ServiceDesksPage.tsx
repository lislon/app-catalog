import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
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
import { useUiSettings } from '~/context/UiSettingsContext'
import { cn } from '~/lib/utils'
import { useAppCatalogContext } from '../../context/AppCatalogContext'
import { DeskCard, ServiceDeskCard } from '../serviceDesks/ServiceDeskCard'
import { ServiceDeskDetail } from '../serviceDesks/ServiceDeskDetail'
import {
  allForms,
  effectiveQuery,
  findBySlug,
  formSlug,
  hasPortal,
  searchServiceDesks,
} from '../serviceDesks/searchServiceDesks'
import type { AreaIcon } from '~/types/uiSettings'
import type {
  FormResult,
  PortalDesk,
  ServiceDesk,
} from '../serviceDesks/searchServiceDesks'

/** Results rendered before "Show more": a one-letter query matches hundreds. */
const FIRST_PAGE = 50

/** Forms whose desk has no area yet. */
const NO_AREA = 'Other forms'
/** Desks that offer no forms: chat bots, web forms, portals with nothing listed. */
const NO_FORMS = 'Other ways to ask'

/**
 * Service Desks view (#9, #273): one search over every service desk — its key,
 * name, description, request forms and their dropdown options. Flat: every entry
 * is a form, and its card is the route `/service-desks/<slug>`; there is no
 * desk-level card. With no search, every form is listed by area, like the
 * catalog home; desks that offer no forms are plain links at the end.
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
  // The open card is the route, so Back closes it and a link reopens it.
  const { slug: openSlug } = useParams({ strict: false })
  const { desk: legacyDesk, form: legacyForm } = useSearch({ strict: false })
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

  // Desks found by name or description that offer no forms: links only.
  const plainHits = useMemo(() => {
    if (!isSearching) return []
    const q = query.trim().toLowerCase()
    return desks.filter(
      (d) =>
        offersNoForms(d) &&
        `${d.displayName} ${d.config.description ?? ''}`
          .toLowerCase()
          .includes(q),
    )
  }, [desks, isSearching, query])

  const areas = useMemo(
    () => groupByArea(desks, portalDesks),
    [desks, portalDesks],
  )

  const onOpen = useCallback(
    (slug: string) =>
      void navigate({ to: '/service-desks/$slug', params: { slug } }),
    [navigate],
  )
  const onClose = () => void navigate({ to: '/service-desks' })
  const opened = openSlug ? findBySlug(portalDesks, openSlug) : undefined

  // `?desk=&form=` links from before a card had its own address.
  useEffect(() => {
    if (!legacyDesk || !fetched.data) return
    const desk = portalDesks.find((d) => d.slug === legacyDesk)
    const form = desk?.config.portal.requestTypes.find(
      (f) => f.id === String(legacyForm),
    )
    void (desk && form
      ? navigate({
          to: '/service-desks/$slug',
          params: { slug: formSlug(desk, form) },
          replace: true,
        })
      : navigate({ to: '/service-desks', replace: true }))
  }, [legacyDesk, legacyForm, fetched.data, portalDesks, navigate])

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
                  <ul className="flex flex-col gap-3">
                    {plainHits.map((d) => (
                      <DeskCard key={d.slug} desk={d} />
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

      {opened && (
        <ServiceDeskDetail
          desk={opened.desk}
          form={opened.form}
          onClose={onClose}
        />
      )}
    </div>
  )
}

const areaId = (area: string) =>
  `area-${area.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

/** One row of the area listing: a form, or a desk that is only a link. */
type Entry =
  | { kind: 'form'; result: FormResult }
  | { kind: 'link'; desk: ServiceDesk }

/**
 * Every form by area, with a contents list beside it on wide screens. The list
 * scrolls the page to an area and marks the one being read.
 */
function AreaBrowse({
  areas,
  onOpen,
  scrollRef,
}: {
  areas: [string, Entry[]][]
  onOpen: (slug: string) => void
  scrollRef: React.RefObject<HTMLDivElement | null>
}) {
  const icons = useUiSettings().serviceDesks?.areaIcons
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
              <AreaMark Icon={icons?.[area]} />
              <h2 className="m-0 font-serif text-[27px] font-semibold leading-tight tracking-tight">
                {area}
              </h2>
              <span className="text-[13px] text-muted-foreground">
                {countLabel(list)}
              </span>
            </div>
            <ul className="flex flex-col gap-3">
              {list.map((e) =>
                e.kind === 'form' ? (
                  <ServiceDeskCard
                    key={`${e.result.desk.slug}:${e.result.form.id}`}
                    result={e.result}
                    query=""
                    onOpen={onOpen}
                    showArea={false}
                  />
                ) : (
                  <DeskCard key={e.desk.slug} desk={e.desk} />
                ),
              )}
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
 * The deployment's icon for an area, as on the catalog home; the accent bar
 * when it has none. Decorative: the heading beside it carries the name.
 */
function AreaMark({ Icon }: { Icon?: AreaIcon }) {
  return Icon ? (
    <Icon size={26} strokeWidth={1.75} className="shrink-0 text-primary" />
  ) : (
    <div className="h-[3px] w-11 shrink-0 rounded-full bg-primary" />
  )
}

const offersNoForms = (d: ServiceDesk) =>
  !hasPortal(d) || d.config.portal.requestTypes.length === 0

const countLabel = (list: Entry[]) => {
  const n = list.length
  return list[0]?.kind === 'link'
    ? `${n} ${n === 1 ? 'desk' : 'desks'}`
    : `${n} ${n === 1 ? 'form' : 'forms'}`
}

/**
 * Forms by their desk's area, areas A to Z, then desk and form A to Z inside
 * one. Forms of a desk with no area come next to last; desks that offer no
 * forms come last, as links.
 */
function groupByArea(
  desks: ServiceDesk[],
  portalDesks: PortalDesk[],
): [string, Entry[]][] {
  const byArea = new Map<string, Entry[]>()
  const add = (area: string, e: Entry) =>
    byArea.set(area, [...(byArea.get(area) ?? []), e])
  for (const result of allForms(portalDesks)) {
    add(result.desk.config.portal.area || NO_AREA, { kind: 'form', result })
  }
  for (const desk of desks.filter(offersNoForms)) {
    add(NO_FORMS, { kind: 'link', desk })
  }
  const rank = (a: string) => (a === NO_FORMS ? 2 : a === NO_AREA ? 1 : 0)
  return [...byArea.entries()].sort(
    ([a], [b]) => rank(a) - rank(b) || a.localeCompare(b),
  )
}
