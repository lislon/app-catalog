import type {
  ServiceRequestField,
  ServiceRequestType,
} from '@igstack/app-catalog-backend-core'
import {
  ArrowUpRight,
  ExternalLink,
  MessageSquareText,
  User,
} from 'lucide-react'
import { displayUrl } from '~/modules/appCatalog/utils/displayUrl'
import { DetailDialogShell } from '../catalog/DetailDialogShell'
import { MarkdownText } from '../components/MarkdownText'
import { DetailTabs } from '../detail/DetailTabs'
import { liveOptions } from './searchServiceDesks'
import type { PortalDesk } from './searchServiceDesks'

/**
 * One form's card, at `/service-desks/<slug>`. Overview reads top to bottom like
 * a short page: what the request is for, the one way into it, what it asks, and
 * what happens after. Behind this card says where the card comes from.
 *
 * One link only: the button. The header is the subject, not a second door.
 */
export function ServiceDeskDetail({
  desk,
  form,
  onClose,
}: {
  desk: PortalDesk
  form: ServiceRequestType
  onClose: () => void
}) {
  const portal = desk.config.portal

  const band = (
    <div className="pr-20">
      <h2 className="m-0 font-serif text-[28px] font-semibold leading-tight tracking-tight">
        {form.name}
      </h2>
      <p className="mt-1 text-[14px] text-muted-foreground">
        <span className="font-semibold tracking-wide" title="Portal key">
          {portal.key}
        </span>
        · {desk.displayName}
      </p>
    </div>
  )

  return (
    <DetailDialogShell
      label={`${form.name} details`}
      shownKey={`${desk.slug}:${form.id}`}
      maxWidthClass="max-w-[min(1000px,94vw)]"
      focusSelector="[data-primary-action]"
      onClose={onClose}
    >
      <DetailTabs
        band={band}
        bandClassName="-mx-6 -mt-5 px-6 pt-5 sm:-mx-8 sm:-mt-7 sm:px-8 sm:pt-7"
        tabs={[
          {
            id: 'overview',
            label: 'Overview',
            render: () => <Overview desk={desk} form={form} />,
          },
          {
            id: 'behind',
            label: 'Behind this card',
            render: () => <Behind desk={desk} />,
          },
        ]}
      />
    </DetailDialogShell>
  )
}

/** The card's one link out. The address is in its tooltip, not on the page. */
function OpenButton({ url, label }: { url: string; label: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={url}
      data-primary-action
      className="inline-flex h-11 items-center gap-1.5 rounded-full bg-primary px-5 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
    >
      {label}
      <ArrowUpRight className="size-4" aria-hidden="true" />
    </a>
  )
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h3 className="m-0 mb-2 text-[15px] font-semibold">{children}</h3>
}

function Overview({
  desk,
  form,
}: {
  desk: PortalDesk
  form: ServiceRequestType
}) {
  const portal = desk.config.portal
  return (
    <div className="flex max-w-[760px] flex-col gap-8 pt-1">
      <div>
        {form.description && (
          <p className="text-[17px] leading-[1.6]">{form.description}</p>
        )}
        {desk.config.description && (
          <p
            className={
              form.description
                ? 'mt-2 text-[14px] text-muted-foreground'
                : 'text-[17px] leading-[1.6]'
            }
          >
            {desk.config.description}
          </p>
        )}
        <div className="mt-5">
          <OpenButton url={form.url} label="Open the form" />
        </div>
      </div>

      <div>
        <Heading>You will be asked for</Heading>
        <FieldList fields={form.fields} />
      </div>

      <div>
        <Heading>After you file</Heading>
        {portal.followUp || portal.keyPeople?.length || portal.examples ? (
          <FollowUp desk={desk} />
        ) : (
          <p className="text-[14px] text-muted-foreground">
            Nobody has written follow-up notes for this desk yet: what happens
            after you file, who to ask when it stalls.
          </p>
        )}
      </div>

      {portal.area && (
        <p className="text-[13px] text-muted-foreground">Area: {portal.area}</p>
      )}
    </div>
  )
}

/** What the form asks, one line per field. A preview: nothing here is an input. */
function FieldList({ fields }: { fields: ServiceRequestField[] }) {
  if (!fields.length) {
    return (
      <p className="text-[14px] text-muted-foreground">
        Only a summary and a description of the problem.
      </p>
    )
  }
  return (
    <ul className="flex flex-col gap-2 text-[14.5px]">
      {fields.map((f) => (
        <li key={f.name}>
          <span className="font-medium">{f.name}</span>
          {!f.required && (
            <span className="text-muted-foreground"> (optional)</span>
          )}
          <span className="text-muted-foreground"> — {describeField(f)}</span>
        </li>
      ))}
    </ul>
  )
}

const OPTIONS_LISTED = 12

/** What a field takes, in words: its choices, or the kind of value. */
export function describeField(f: ServiceRequestField): string {
  const options = liveOptions(f)
  if (options.length) {
    const listed = options.slice(0, OPTIONS_LISTED).join(', ')
    const more =
      options.length > OPTIONS_LISTED
        ? ` and ${options.length - OPTIONS_LISTED} more`
        : ''
    return `${f.type === 'array' ? 'One or more of' : 'One of'}: ${listed}${more}`
  }
  if (f.type === 'user') return 'A person, picked from the directory'
  if (f.type === 'date' || f.type === 'datetime') return 'A date'
  return 'A short text'
}

function FollowUp({ desk }: { desk: PortalDesk }) {
  const { followUp, keyPeople, examples } = desk.config.portal
  return (
    <div className="flex max-w-[68ch] flex-col gap-5">
      {followUp && <MarkdownText>{followUp}</MarkdownText>}
      {keyPeople?.length ? (
        <div>
          <p className="mb-2 text-[13px] font-semibold">Key people</p>
          <div className="flex flex-wrap gap-2">
            {keyPeople.map((p) => (
              <span
                key={p.name}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-[13px]"
              >
                <User
                  className="size-3.5 text-muted-foreground"
                  aria-hidden="true"
                />
                {p.name}
                {p.role && (
                  <span className="text-muted-foreground">{p.role}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {examples && (
        <div>
          <p className="mb-2 text-[13px] font-semibold">See examples</p>
          <a
            href={examples.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-[var(--radius)] border border-border bg-card px-3.5 py-3 transition-colors hover:border-ring"
          >
            <MessageSquareText
              className="size-5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold">
                {examples.label}
              </span>
              <span className="block truncate text-[13px] text-muted-foreground">
                {displayUrl(examples.url)}
              </span>
            </span>
          </a>
        </div>
      )}
    </div>
  )
}

function Behind({ desk }: { desk: PortalDesk }) {
  const portal = desk.config.portal
  const sources = [
    ...new Set([
      ...(desk.config.url ? [desk.config.url] : []),
      ...(portal.sources ?? []),
    ]),
  ]
  return (
    <div className="behind-panel">
      <section className="behind-group">
        <h2 className="behind-group__title">Kept up to date from</h2>
        <ul className="space-y-2">
          {sources.map((url, i) => (
            <li key={url} className="flex items-center gap-2 text-xs">
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {i + 1}.
              </span>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 truncate hover:text-primary"
              >
                {displayUrl(url)}
                <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
        {portal.syncedAt && (
          <p className="behind-dates">
            Forms and fields last read {portal.syncedAt.slice(0, 10)}.
          </p>
        )}
      </section>
      {(portal.aiPrompt || portal.aiMemory) && (
        <section className="behind-group">
          <h2 className="behind-group__title">
            How the AI maintains this card
          </h2>
          {portal.aiPrompt && (
            <>
              <p className="behind-ai__label">Prompt</p>
              <p className="behind-ai">{portal.aiPrompt}</p>
            </>
          )}
          {portal.aiMemory && (
            <>
              <p className="behind-ai__label">Memory</p>
              <p className="behind-ai">{portal.aiMemory}</p>
            </>
          )}
        </section>
      )}
    </div>
  )
}
