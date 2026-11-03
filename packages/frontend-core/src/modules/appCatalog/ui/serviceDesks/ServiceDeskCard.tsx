import { ExternalLink } from 'lucide-react'
import { memo, useState } from 'react'
import { displayUrl } from '~/modules/appCatalog/utils/displayUrl'
import { Marked } from './Marked'
import { formSlug, hasPortal, liveOptions } from './searchServiceDesks'
import type { FieldMatch, FormResult, ServiceDesk } from './searchServiceDesks'

/** Options shown per matched dropdown before "Show all". */
const OPTIONS_SHOWN = 8

/**
 * One form in the results. Three styles only: the title in ink, everything
 * else muted, and the search marker as the single accent.
 *
 * The card opens the form's own card (`/service-desks/<slug>`); the form's
 * address is the only way out to the portal, so a stray click never leaves the
 * catalog.
 */
export const ServiceDeskCard = memo(function ResultCardView({
  result,
  query,
  onOpen,
  showArea = true,
}: {
  result: FormResult
  query: string
  /** Takes the form's slug. Stable across renders, so an unchanged card skips re-rendering. */
  onOpen: (slug: string) => void
  /** Off inside an area's own section, where the tag would repeat its heading. */
  showArea?: boolean
}) {
  const { desk, form, fieldMatches } = result
  const onOpenDetails = () => onOpen(formSlug(desk, form))
  const portal = desk.config.portal
  return (
    <li
      // A listitem that is also a button: the whole card is the target, and the
      // link and "Show all" inside it keep their own clicks.
      role="button"
      tabIndex={0}
      aria-label={`Details for ${form.name}, ${desk.displayName}`}
      data-testid="service-desk-result"
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('a,button')) onOpenDetails()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) onOpenDetails()
      }}
      className="cursor-pointer rounded-[var(--radius)] border border-border bg-card p-5 transition-colors hover:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <h3 className="text-[17px] font-semibold leading-snug">
        <Marked text={form.name} query={query} />
      </h3>
      <p className="mt-0.5 text-[13px] text-muted-foreground">
        <span className="font-semibold tracking-wide" title="Portal key">
          <Marked text={portal.key} query={query} />
        </span>
        {' · '}
        <Marked text={desk.displayName} query={query} />
      </p>
      {form.description ? (
        <p className="max-w-[68ch] py-3 text-[15px] leading-[1.6]">
          <Marked text={form.description} query={query} />
        </p>
      ) : (
        <div className="h-3" />
      )}
      {fieldMatches.length > 0 && (
        <div className="flex flex-col gap-0.5 pb-3">
          {fieldMatches.map((m) => (
            <MatchedOptions key={m.field.name} match={m} />
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <a
          href={form.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 break-all text-[13.5px] text-muted-foreground underline decoration-muted-foreground/40 underline-offset-2 hover:text-foreground hover:decoration-foreground"
        >
          {displayUrl(form.url)}
          <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
        </a>
        {showArea && portal.area && <Tag>{portal.area}</Tag>}
      </div>
    </li>
  )
})

/**
 * A desk that offers no forms (a chat bot, a web form, a portal with nothing
 * listed): the same anatomy as a form card, and only a link to the desk.
 */
export const DeskCard = memo(function DeskCardView({
  desk,
}: {
  desk: ServiceDesk
}) {
  const portal = hasPortal(desk) ? desk.config.portal : undefined
  const url = desk.config.url
  const body = (
    <>
      <h3
        className="text-[17px] font-semibold leading-snug"
        data-testid="service-desk-name"
      >
        {desk.displayName}
      </h3>
      {portal && (
        <p
          className="mt-0.5 text-[13px] font-semibold tracking-wide text-muted-foreground"
          title="Portal key"
        >
          {portal.key}
        </p>
      )}
      {desk.config.description && (
        <p className="line-clamp-3 max-w-[68ch] py-3 text-[15px] leading-[1.6]">
          {desk.config.description}
        </p>
      )}
      {url && (
        <span className="mt-auto inline-flex min-w-0 items-center gap-1 pt-1 text-[13.5px] text-muted-foreground underline decoration-muted-foreground/40 underline-offset-2">
          <span className="truncate">{displayUrl(url)}</span>
          <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
        </span>
      )}
    </>
  )
  const cls =
    'flex h-full flex-col rounded-[var(--radius)] border border-border bg-card p-5 transition-colors'
  return (
    <li>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`${cls} hover:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`}
        >
          {body}
        </a>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </li>
  )
})

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="whitespace-nowrap rounded-full bg-muted px-2 py-1 text-[11.5px] leading-none text-muted-foreground">
      {children}
    </span>
  )
}

/**
 * A dropdown as one comma-separated line in the form's own order, the matched
 * options marked. Long lists stop after a few, never dropping a match.
 */
function MatchedOptions({ match }: { match: FieldMatch }) {
  const [all, setAll] = useState(false)
  const options = liveOptions(match.field)
  const others = options.filter((o) => !match.matched.includes(o))
  const keep = new Set([
    ...match.matched,
    ...others.slice(0, Math.max(0, OPTIONS_SHOWN - match.matched.length)),
  ])
  const shown = all ? options : options.filter((o) => keep.has(o))
  return (
    <p className="max-w-[68ch] text-[12.5px] leading-[1.55] text-muted-foreground">
      {match.field.name}:{' '}
      {shown.map((option, i) => (
        <span key={option}>
          {i > 0 && ', '}
          {match.matched.includes(option) ? (
            <mark className="whitespace-nowrap rounded-[3px] bg-highlight px-0.5 text-foreground">
              {option}
            </mark>
          ) : (
            option
          )}
        </span>
      ))}
      {options.length > keep.size && (
        <>
          {' '}
          <button
            type="button"
            aria-expanded={all}
            onClick={() => setAll(!all)}
            className="cursor-pointer whitespace-nowrap underline decoration-muted-foreground/40 underline-offset-2 hover:text-foreground"
          >
            {all ? 'Show fewer' : `Show all ${options.length}`}
          </button>
        </>
      )}
    </p>
  )
}
