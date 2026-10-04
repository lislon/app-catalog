import type {
  Resource,
  SourceReference,
} from '@igstack/app-catalog-backend-core'
import { useSearch } from '@tanstack/react-router'
import { CalendarPlus, Clock, ExternalLink, Plus, Trash2 } from 'lucide-react'
import React from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { Badge } from '~/ui/badge'
import { Button } from '~/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/ui/accordion'
import { AccessRequestSection } from '../components/AccessRequestSection'
import { AccessPrerequisiteChain } from '../components/AccessPrerequisiteChain'
import { QuickJumpBar, hasQuickJumps } from '../components/QuickJumpBar'
import { useAppCatalogFilters } from '../context/AppCatalogFiltersContext'
import { PersonBadge } from '../components/PersonBadge'
import { useUser } from '~/modules/auth'
import { InlineEditableField } from '../components/InlineEditableField'
import { MarkdownText } from '../components/MarkdownText'
import { ScreenshotGallery } from '../components/ScreenshotGallery'
import { SourcePulse } from '../components/SourcePulse'
import { useUpdateApp } from '../../hooks/useUpdateApp'
import { useAppCatalogContext } from '../../context/AppCatalogContext'
import { useAppClickHistory } from '../../hooks/useAppClickHistory'
import { formatRelativeTime } from '../../utils/formatRelativeTime'
import { TierVariantsSection } from '../components/TierVariantsSection'
import { SubResourcesSection } from '../components/SubResourcesSection'
import { getChildResources } from '../../utils/resolveHelpers'
import { FeedbackSection } from './FeedbackSection'
import { displayUrl } from '~/modules/appCatalog/utils/displayUrl'
import { accessTabLabel } from '~/modules/appCatalog/utils/accessTabLabel'
import { AppDoor } from './AppDoor'
import { DetailTabs } from './DetailTabs'
import type { DetailTab } from './DetailTabs'

/** Tab ids. Public — they land in `?tab=`, so renaming one breaks links. */
const TAB = {
  overview: 'overview',
  access: 'access',
  resources: 'resources',
  documentation: 'documentation',
  notes: 'notes',
} as const

/** A labelled block inside a tab. One register for all of them. */
function Section({
  title,
  hint,
  first,
  children,
}: {
  title: string
  hint?: string
  /** Drops the top margin for the first block in a panel. */
  first?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={first ? '' : 'mt-7'}>
      <h3 className="section-label mb-1.5">{title}</h3>
      {hint && <p className="mb-2 text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  )
}

function AppScreenshot({ app }: { app: Resource }) {
  const [imageError, setImageError] = React.useState(false)
  const [isLoadingImage, setIsLoadingImage] = React.useState(true)

  const screenshotId = app.screenshotIds?.[0]
  if (!screenshotId) {
    return (
      <div className="w-full bg-muted/50 rounded-lg overflow-hidden flex items-center justify-center min-h-64">
        <div className="w-full h-64 bg-muted/30 flex items-center justify-center text-muted-foreground text-sm">
          No screenshot available
        </div>
      </div>
    )
  }

  const screenshotImageUrl = `/api/screenshots/${screenshotId}?size=512`

  return (
    <div className="w-full flex justify-center">
      <div className="rounded-lg overflow-hidden inline-flex items-center justify-center min-h-64">
        {!imageError ? (
          <img
            src={screenshotImageUrl}
            alt={`${app.abbreviation || app.displayName} screenshot`}
            className="h-64 object-contain"
            onError={() => {
              setImageError(true)
              setIsLoadingImage(false)
            }}
            onLoad={() => setIsLoadingImage(false)}
          />
        ) : null}
        {(imageError || isLoadingImage) && (
          <div className="w-full h-64 bg-muted/30 flex items-center justify-center text-muted-foreground text-sm">
            {isLoadingImage
              ? 'Loading screenshot...'
              : 'No screenshot available'}
          </div>
        )}
      </div>
    </div>
  )
}

export function AppDetails({
  app,
  onAppClick,
  onClosePanel,
}: {
  app: Resource
  onAppClick?: (app: Resource) => void
  onClosePanel: () => void
}) {
  const [isGalleryOpen, setIsGalleryOpen] = React.useState(false)
  const [galleryInitialIndex, setGalleryInitialIndex] = React.useState(0)
  /**
   * Set by the band's "Suggest a change", which has to do two things the button
   * cannot do alone: bring the notes tab forward, and open the composer inside it.
   * Held here because the band and the panel are siblings — neither can reach the
   * other, and routing it through the URL would put a transient intent in a
   * shareable link.
   *
   * A count, not a flag: the composer closes itself on send, so asking a second
   * time has to be distinguishable from the first ask still being set. As a
   * boolean the second click changed nothing and the button was dead for the rest
   * of the card's life.
   */
  const [composeRequests, setComposeRequests] = React.useState(0)

  const { approvalMethods, resources: allResources } = useAppCatalogContext()
  const { recordClick } = useAppClickHistory()
  const updateApp = useUpdateApp()
  const [draftSource, setDraftSource] = React.useState<string | null>(null)
  const user = useUser()
  const isAdmin = user?.isAdmin ?? false
  const { state: filterState } = useAppCatalogFilters()

  // Arriving with `?sub=` means the visitor picked one child out of a search —
  // so the card has to open ON that child's tab. Landing on Overview and
  // leaving them to find the tab is the bug this scenario exists to prevent.
  const search = useSearch({ strict: false })
  const subSlug = search.sub

  const displayTags = (app.tags ?? []).filter((tag) => !tag.includes(':'))
  const sourceUrls: string[] =
    app.sources?.map((s) => (typeof s === 'string' ? s : s.url)) ?? []
  const displaySources =
    draftSource !== null ? [...sourceUrls, draftSource] : sourceUrls
  // The list renders bare URLs (they are editable as text), so the pulse has to
  // be looked up rather than carried alongside. Absent until the autoupdate loop
  // has seen the source — a freshly added one simply gets no mark.
  const pulseByUrl = React.useMemo(() => {
    const byUrl = new Map<string, NonNullable<SourceReference['pulse']>>()
    for (const source of app.sources ?? []) {
      if (typeof source !== 'string' && source.pulse) {
        byUrl.set(source.url, source.pulse)
      }
    }
    return byUrl
  }, [app.sources])

  const children = React.useMemo(
    () => getChildResources(allResources, app.slug),
    [allResources, app.slug],
  )

  // Enter: open screenshot gallery
  useHotkeys(
    'enter',
    () => {
      const tag = document.activeElement?.tagName
      if (
        tag === 'BUTTON' ||
        tag === 'A' ||
        tag === 'INPUT' ||
        tag === 'SELECT' ||
        tag === 'TEXTAREA'
      )
        return

      if (app.screenshotIds && app.screenshotIds.length > 0) {
        setGalleryInitialIndex(0)
        setIsGalleryOpen(true)
      }
    },
    { enabled: !isGalleryOpen },
    [app, isGalleryOpen],
  )

  // Esc: close the details panel (only when gallery is NOT open)
  //
  // From inside a text field too: the Quick Jump field holds the caret from the
  // moment the card opens, so the default "ignore form tags" left the card with
  // no keyboard way out. A field that wants Esc for itself stops the event —
  // InlineEditableField does, so Esc there cancels the edit and nothing more.
  useHotkeys(
    'escape',
    () => {
      onClosePanel()
    },
    { enabled: !isGalleryOpen, enableOnFormTags: ['input'] },
    [isGalleryOpen, onClosePanel],
  )

  const handleScreenshotClick = (index: number) => {
    setGalleryInitialIndex(index)
    setIsGalleryOpen(true)
  }

  // Find replacement app if deprecated
  const replacementApp = app.deprecated?.replacementSlug
    ? allResources.find((a) => a.slug === app.deprecated?.replacementSlug)
    : null

  const access = accessTabLabel(app, approvalMethods)

  const hasResourcesTab = children.length > 0 || (app.tiers?.length ?? 0) > 0
  const resourcesLabel = children.length
    ? (app.childrenLabel ?? 'Resources')
    : 'Environments'

  const tabs: DetailTab[] = [
    {
      id: TAB.overview,
      label: 'Overview',
      render: () => (
        <>
          <Section title="Description" first>
            {isAdmin ? (
              <InlineEditableField
                value={app.description ?? ''}
                onSave={(description) =>
                  updateApp.mutate({ id: app.id, data: { description } })
                }
                multiline
                placeholder="Description"
                className="min-h-[4rem] resize-y text-sm text-muted-foreground"
              />
            ) : app.description ? (
              <MarkdownText className="prose prose-sm max-w-none text-sm text-muted-foreground [&_p]:m-0">
                {app.description}
              </MarkdownText>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </Section>

          {app.screenshotIds && app.screenshotIds.length > 0 && (
            <Section title={`Screenshots (${app.screenshotIds.length})`}>
              {/* A button, not a clickable div: the gallery was unreachable by
                  keyboard, and a role + label gives it a stable handle. */}
              <button
                type="button"
                aria-label={`View screenshots of ${app.displayName}`}
                className="block w-full cursor-pointer text-left hover:opacity-80 transition-opacity"
                onClick={() => handleScreenshotClick(0)}
              >
                <AppScreenshot app={app} />
                {app.screenshotIds.length > 1 && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Click to view all {app.screenshotIds.length} screenshots
                  </p>
                )}
              </button>
            </Section>
          )}

          {/* Owner — who is responsible for this resource. Distinct from the
              access approver (who decides access requests); see domain model. */}
          {app.ownerPersonSlug && (
            <Section title="Owner" hint="Who is responsible for this resource">
              <PersonBadge slug={app.ownerPersonSlug} />
            </Section>
          )}

          {/* Tags, minus the indexing machinery: `namespace:value` tags drive
              grouping, faceting and placement, are about half of all tag
              references, and say nothing about what an app is for. The colon is
              the test. Search still matches them — only the display drops them. */}
          {displayTags.length > 0 && (
            <Section title="Tags">
              <div className="flex flex-wrap gap-2">
                {displayTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </Section>
          )}

          {app.teams && app.teams.length > 0 && (
            <Section title="Teams">
              <div className="flex flex-wrap gap-2">
                {app.teams.map((team) => (
                  <Badge key={team} variant="outline" className="text-xs">
                    {team}
                  </Badge>
                ))}
              </div>
            </Section>
          )}
        </>
      ),
    },
    {
      id: TAB.access,
      label: `Access — ${access.route}`,
      chip: access.chip,
      render: () => (
        <>
          {/* Two-step access: for a nested resource, show the parent-first
              prerequisite chain before this resource's own instructions. */}
          <AccessPrerequisiteChain resource={app} onOpenParent={onAppClick} />
          <AccessRequestSection app={app} approvalMethods={approvalMethods} />
        </>
      ),
    },
    ...(hasResourcesTab
      ? [
          {
            id: TAB.resources,
            label: resourcesLabel,
            chip: children.length ? String(children.length) : undefined,
            render: () => (
              <>
                {app.tiers && app.tiers.length > 0 && (
                  <TierVariantsSection tiers={app.tiers} />
                )}
                {children.length > 0 && (
                  <div className={app.tiers?.length ? 'mt-7' : ''}>
                    {/* The active catalog search term seeds the filter, so a
                        visitor who got here by searching something that matched
                        a child sees that child rather than all of its siblings. */}
                    <SubResourcesSection
                      subResources={children}
                      parentSlug={app.slug}
                      initialSearch={filterState.searchValue}
                    />
                  </div>
                )}
              </>
            ),
          } satisfies DetailTab,
        ]
      : []),
    {
      id: TAB.documentation,
      label: 'Documentation',
      render: () => (
        <>
          {app.links && app.links.length > 0 && (
            <Section title="Documentation" first>
              <div className="space-y-0.5">
                {app.links.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary truncate"
                  >
                    <ExternalLink className="size-3 shrink-0" />
                    {link.title || displayUrl(link.url)}
                  </a>
                ))}
              </div>
            </Section>
          )}
          {/* Background: why the app exists at all. Deliberately quiet — a
              reader who came to get access has already passed everything they
              need, and history should not compete with the description. */}
          {app.background && (
            <Section title="Background">
              <MarkdownText className="prose prose-sm text-muted-foreground max-w-none text-sm [&_p]:mt-0 [&_p]:mb-2 [&_p:last-child]:mb-0">
                {app.background}
              </MarkdownText>
            </Section>
          )}

          <Section title="Sources" first={!app.background}>
            {isAdmin ? (
              <>
                <ul className="space-y-2">
                  {displaySources.map((url, index) => {
                    const isDraft =
                      draftSource !== null && index === sourceUrls.length
                    return (
                      <li
                        key={isDraft ? 'draft' : `${index}-${url}`}
                        className="group flex items-center gap-2 text-xs"
                      >
                        <span className="text-muted-foreground shrink-0 tabular-nums">
                          {index + 1}.
                        </span>
                        <InlineEditableField
                          value={url}
                          initialEditMode={isDraft}
                          onCancel={
                            isDraft ? () => setDraftSource(null) : undefined
                          }
                          onSave={(newUrl) => {
                            if (isDraft) {
                              setDraftSource(null)
                              if (newUrl) {
                                updateApp.mutate({
                                  id: app.id,
                                  data: { sources: [...sourceUrls, newUrl] },
                                })
                              }
                            } else {
                              const next = [...sourceUrls]
                              next[index] = newUrl
                              updateApp.mutate({
                                id: app.id,
                                data: { sources: next.filter(Boolean) },
                              })
                            }
                          }}
                          placeholder="https://..."
                          viewClassName="flex-1 min-w-0"
                          renderView={(val) =>
                            val ? (
                              <a
                                href={val}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-primary inline-flex items-center gap-1 truncate"
                              >
                                {displayUrl(val)}
                                <ExternalLink className="size-3 shrink-0" />
                              </a>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )
                          }
                        />
                        {!isDraft && pulseByUrl.has(url) && (
                          <SourcePulse
                            pulse={pulseByUrl.get(url)!}
                            className="ml-auto"
                          />
                        )}
                        {!isDraft && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Remove source"
                            className="shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              const next = sourceUrls.filter(
                                (_, i) => i !== index,
                              )
                              updateApp.mutate({
                                id: app.id,
                                data: { sources: next },
                              })
                            }}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </li>
                    )
                  })}
                </ul>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 gap-1 text-muted-foreground"
                  onClick={() => setDraftSource('')}
                >
                  <Plus className="size-3.5" />
                  Add source
                </Button>
              </>
            ) : (
              <ul className="space-y-2">
                {sourceUrls.map((url, index) => (
                  // `group` so hovering anywhere on the row fades that source's
                  // track in — the mark sits in a right-hand column, and row
                  // hover is what ties the two ends of a wide row together.
                  <li
                    key={index}
                    className="group flex items-center gap-2 text-xs"
                  >
                    <span className="text-muted-foreground shrink-0 tabular-nums">
                      {index + 1}.
                    </span>
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary inline-flex min-w-0 items-center gap-1 truncate"
                      >
                        {displayUrl(url)}
                        <ExternalLink className="size-3 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                    {pulseByUrl.has(url) && (
                      <SourcePulse
                        pulse={pulseByUrl.get(url)!}
                        className="ml-auto"
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* These used to sit unlabelled in a 64px gap between two sections,
              which is what made that gap look like a mistake. Labelled, in
              their own block. "Dates" rather than "Added / updated" on purpose:
              a label that repeats the first word of every line below it adds
              nothing, and it made "Added"/"Updated" ambiguous to anything
              matching on text — including this card's own tests. */}
          {(app.createdAt || app.freshness?.lastCheckedAt) && (
            <Section title="Dates">
              <div className="flex flex-wrap gap-x-5 gap-y-1">
                {app.createdAt && (
                  <span
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                    title={app.createdAt}
                  >
                    <CalendarPlus className="size-3" />
                    Added {formatRelativeTime(app.createdAt)}
                  </span>
                )}
                {app.freshness?.lastCheckedAt && (
                  <span
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                    title={
                      app.freshness.lastContentChangeAt
                        ? `Content last changed ${app.freshness.lastContentChangeAt} · last checked ${app.freshness.lastCheckedAt}`
                        : `Last checked ${app.freshness.lastCheckedAt}`
                    }
                  >
                    <Clock className="size-3" />
                    {/* "Updated" means the content changed, not that a check
                        ran — entries predating the field have none, so fall
                        back. */}
                    Updated{' '}
                    {formatRelativeTime(
                      app.freshness.lastContentChangeAt ??
                        app.freshness.lastCheckedAt,
                    )}
                    {app.freshness.isStale && (
                      <span className="italic opacity-75">
                        {' '}
                        · may be out of date
                      </span>
                    )}
                  </span>
                )}
              </div>
            </Section>
          )}

          {/* Technical information: AI-facing fields, de-emphasized/collapsed */}
          {(app.aiPrompt || app.aiMemory) && (
            <Accordion type="single" collapsible className="mt-7">
              <AccordionItem
                value="technical-info"
                className="border rounded-lg px-4"
              >
                <AccordionTrigger className="text-sm hover:no-underline py-3">
                  Technical information
                </AccordionTrigger>
                <AccordionContent className="pb-3 space-y-3">
                  {app.aiPrompt && (
                    <div>
                      <h4 className="section-label mb-1">AI Prompt</h4>
                      <p className="text-xs whitespace-pre-wrap">
                        {app.aiPrompt}
                      </p>
                    </div>
                  )}
                  {app.aiMemory && (
                    <div>
                      <h4 className="section-label mb-1">AI Memory</h4>
                      <p className="text-xs whitespace-pre-wrap">
                        {app.aiMemory}
                      </p>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </>
      ),
    },
    {
      id: TAB.notes,
      label: 'Notes & requests',
      render: () => (
        <FeedbackSection appSlug={app.slug} openComposer={composeRequests} />
      ),
    },
  ]

  // The hero band: identity, the way in, and the typed-id jumps. It does NOT
  // scroll away with a tab, so "take me to the app" is reachable from every one
  // of them.
  //
  // Deliberately holds nothing else. An owner/teams/freshness strip was drawn
  // and dropped: `ownerPersonSlug` is set on a tiny fraction of entries so the
  // owner slot would almost always be empty, teams already has its own block in
  // Overview, and on an entry with quick jumps the band had grown past 250px
  // before any content — on exactly the apps where people most want to type an
  // id and leave.
  const band = (
    <>
      <div className="flex flex-wrap items-center gap-x-7 gap-y-2">
        <AppDoor app={app} onOpen={() => recordClick(app.slug)} />
        {app.deprecated && (
          <Badge
            variant={
              app.deprecated.type === 'discouraged'
                ? 'secondary'
                : 'destructive'
            }
          >
            {app.deprecated.type === 'discouraged'
              ? 'Discouraged'
              : 'Deprecated'}
          </Badge>
        )}
        {/* In the band, not at the foot of the notes panel.
            Down there it was invisible twice over: below the fold of a panel, and
            behind a tab nobody opens unless they already know what is in it — so
            the one affordance the feature exists for was the hardest thing on the
            card to find. Up here it is present on every tab, which is the whole
            reason the band does not scroll away.
            `mr-10` keeps it clear of the dialog's own close button at top-right. */}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="ml-auto mr-10"
          onClick={() => setComposeRequests((n) => n + 1)}
        >
          ✎ Suggest a change
        </Button>
      </div>

      {app.nicknames && app.nicknames.length > 0 && (
        <p className="mt-2.5 text-xs text-muted-foreground">
          Also known as {app.nicknames.join(', ')}
        </p>
      )}

      {isAdmin && (
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1">
          <span className="inline-flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Slug:</span>
            <InlineEditableField
              value={app.slug}
              onSave={(slug) =>
                updateApp.mutate({ id: app.id, data: { slug } })
              }
              className="text-sm"
            />
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="text-xs text-muted-foreground">URL:</span>
            <InlineEditableField
              value={app.appUrl ?? ''}
              onSave={(appUrl) =>
                updateApp.mutate({ id: app.id, data: { appUrl } })
              }
              placeholder="App URL"
              className="text-sm"
            />
          </span>
        </div>
      )}

      {hasQuickJumps(app) && (
        <div className="mt-4">
          {/* Named, where the bare control was not: "or go straight to a
                  record" says what the field is for before you reach it. */}
          <p className="mb-1.5 text-xs text-muted-foreground">
            Or go straight to a record:
          </p>
          <QuickJumpBar app={app} />
        </div>
      )}

      {/* Deprecation stays in the band, not in a tab: "do not use this"
              must not be something you have to go looking for. */}
      {app.deprecated &&
        (() => {
          const isDiscouraged = app.deprecated.type === 'discouraged'
          return (
            <div
              className={
                isDiscouraged
                  ? 'mt-4 rounded-lg border border-yellow-500/50 bg-yellow-50 p-4 dark:bg-yellow-950/20'
                  : 'mt-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4'
              }
            >
              <h3
                className={
                  isDiscouraged
                    ? 'section-label mb-1.5 text-yellow-700 dark:text-yellow-500'
                    : 'section-label mb-1.5 text-destructive'
                }
              >
                {isDiscouraged
                  ? 'Usage discouraged'
                  : 'This application is deprecated'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {app.deprecated.comment}
              </p>
              {replacementApp && (
                <button
                  type="button"
                  onClick={() => onAppClick?.(replacementApp)}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  View replacement: {replacementApp.displayName}
                  <ExternalLink className="size-3" />
                </button>
              )}
            </div>
          )
        })()}
    </>
  )

  return (
    <>
      <div className="flex h-full flex-col">
        <DetailTabs
          tabs={tabs}
          band={band}
          // Cancels the dialog's own padding so the tint reaches the card's
          // edges, then re-applies it inside.
          bandClassName="-mx-6 -mt-5 px-6 pt-5 sm:-mx-8 sm:-mt-7 sm:px-8 sm:pt-7"
          // `?sub=` means a child was picked out of a search, so the card opens
          // on the tab that holds it rather than making them hunt for it.
          forcedTab={subSlug && hasResourcesTab ? TAB.resources : undefined}
          requestTab={composeRequests > 0 ? TAB.notes : undefined}
          requestNonce={composeRequests}
        />
      </div>

      {/* Screenshot Gallery Dialog */}
      <ScreenshotGallery
        app={app}
        screenshotIds={app.screenshotIds || []}
        open={isGalleryOpen}
        onOpenChange={setIsGalleryOpen}
        initialIndex={galleryInitialIndex}
        title={`${app.abbreviation || app.displayName} - Screenshots`}
      />
    </>
  )
}
