import { ExternalLink } from 'lucide-react'
import { memo, useState } from 'react'
import { displayUrl } from '~/modules/appCatalog/utils/displayUrl'
import { Marked } from './Marked'
import { hasPortal, liveOptions } from './searchServiceDesks'
import type { FieldMatch, FormResult, ServiceDesk } from './searchServiceDesks'

/** Options shown per matched dropdown before "Show all". */
const OPTIONS_SHOWN = 8

/**
 * One form in the results. Three styles only: the title in ink, everything
 * else muted, and the search marker as the single accent.
 *
 * The card opens the desk's details; the form's address is the only way out to
 * the portal, so a stray click never leaves the catalog.
 */
export const ServiceDeskCard = memo(function ResultCardView({
  result,
  query,
  onOpen,
}: {
  result: FormResult
  query: string
  /** Stable across renders, so an unchanged card skips re-rendering. */
  onOpen: (deskSlug: string, formId?: string) => void
}) {
  const { desk, form, fieldMatches } = result
  const onOpenDetails = () => onOpen(desk.slug, form.id)
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
      <h2 className="text-[17px] font-semibold leading-snug">
        <Marked text={form.name} query={query} />
      </h2>
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
        {portal.area && (
          <span className="whitespace-nowrap rounded-full bg-muted px-2 py-1 text-[11.5px] leading-none text-muted-foreground">
            {portal.area}
          </span>
        )}
      </div>
    </li>
  )
})

/**
 * A desk on the Service Desks home: the same anatomy as a result card, minus
 * the form and its fields. A desk with a portal opens its details; one without
 * (a chat bot, a web form) is only its link.
 */
export const DeskCard = memo(function DeskCardView({
  desk,
  onOpen,
  showArea = true,
}: {
  desk: ServiceDesk
  onOpen: (deskSlug: string) => void
  /** Off inside an area's own section, where the tag would repeat its heading. */
  showArea?: boolean
}) {
  const portal = hasPortal(desk) ? desk.config.portal : undefined
  const url = desk.config.url
  const forms = portal?.requestTypes.length ?? 0
  const open = () =>
    portal
      ? onOpen(desk.slug)
      : url && window.open(url, '_blank', 'noopener,noreferrer')
  return (
    <li
      role="button"
      tabIndex={0}
      aria-label={
        portal ? `Details for ${desk.displayName}` : `Open ${desk.displayName}`
      }
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('a,button')) open()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) open()
      }}
      className="flex cursor-pointer flex-col rounded-[var(--radius)] border border-border bg-card p-5 transition-colors hover:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
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
      <div className="mt-auto flex flex-wrap items-end justify-between gap-x-4 gap-y-2 pt-1">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-w-0 items-center gap-1 text-[13.5px] text-muted-foreground underline decoration-muted-foreground/40 underline-offset-2 hover:text-foreground hover:decoration-foreground"
          >
            <span className="truncate">{displayUrl(url)}</span>
            <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
          </a>
        ) : (
          <span />
        )}
        <span className="flex flex-wrap justify-end gap-1">
          {forms > 0 && <Tag>{forms === 1 ? '1 form' : `${forms} forms`}</Tag>}
          {showArea && portal?.area && <Tag>{portal.area}</Tag>}
        </span>
      </div>
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
