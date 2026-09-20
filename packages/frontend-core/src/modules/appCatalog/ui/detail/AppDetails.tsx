import type {
  Resource,
  SourceReference,
} from '@igstack/app-catalog-backend-core'
import {
  AppWindow,
  CalendarPlus,
  Clock,
  ExternalLink,
  Plus,
  Trash2,
} from 'lucide-react'
import React from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { cn } from '~/lib/utils'
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
import { LEAP, LEAVE_FILL, QuickJumpBar } from '../components/QuickJumpBar'
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
import { CommentsSection } from './CommentsSection'
import { displayUrl } from '~/modules/appCatalog/utils/displayUrl'

function getIconUrl(iconName: string): string {
  return `/api/icons/${iconName}`
}

function AppIcon({ app, className }: { app: Resource; className?: string }) {
  const [imageError, setImageError] = React.useState(false)

  // Use iconName from backend if available
  if (app.iconName && !imageError) {
    return (
      <div className={cn('size-12 shrink-0', className)}>
        <img
          src={getIconUrl(app.iconName)}
          alt={`${app.abbreviation || app.displayName} icon`}
          className="size-12 rounded-lg object-contain"
          onError={() => setImageError(true)}
        />
      </div>
    )
  }

  // Fallback icon
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-lg bg-primary/10 text-primary size-12 shrink-0',
        className,
      )}
    >
      <AppWindow className="size-6" />
    </div>
  )
}

function AppScreenshot({ app }: { app: Resource }) {
  const [imageError, setImageError] = React.useState(false)
  const [isLoadingImage, setIsLoadingImage] = React.useState(true)

  // Check if app has screenshots
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

function TiersAndSubResourcesPanel({ app }: { app: Resource }) {
  const { resources } = useAppCatalogContext()
  // #38 item C: the active catalog search term. When the user reached this app
  // by searching something that matched a child, seed the sub-resource filter
  // with it so the matched child is revealed.
  const { state: filterState } = useAppCatalogFilters()
  const appSubResources = React.useMemo(
    () => getChildResources(resources, app.slug),
    [resources, app.slug],
  )

  return (
    <>
      {app.tiers && app.tiers.length > 0 && (
        <div className="mt-6">
          <TierVariantsSection tiers={app.tiers} />
        </div>
      )}
      {appSubResources.length > 0 && (
        <div className="mt-6">
          <SubResourcesSection
            subResources={appSubResources}
            parentSlug={app.slug}
            initialSearch={filterState.searchValue}
          />
        </div>
      )}
    </>
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
  const { approvalMethods, resources: allResources } = useAppCatalogContext()
  const { recordClick } = useAppClickHistory()
  const updateApp = useUpdateApp()
  const [draftSource, setDraftSource] = React.useState<string | null>(null)
  const user = useUser()
  const isAdmin = user?.isAdmin ?? false

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
  useHotkeys(
    'escape',
    () => {
      onClosePanel()
    },
    { enabled: !isGalleryOpen },
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

  return (
    <>
      <div className="flex h-full flex-col p-6">
        {/* Icon and Title — always first: a pinned Quick Jump takes order -1,
            so the header claims -2 rather than being pushed below it. */}
        <div className="-order-2 border-b pb-6">
          <div className="flex items-center gap-3">
            <AppIcon app={app} className="size-16" />
            <div className="-mx-3 flex-1 min-w-0">
              <div className="flex items-center gap-2 px-3">
                <div className="font-serif text-2xl font-semibold min-w-0">
                  {app.abbreviation
                    ? `${app.displayName} (${app.abbreviation})`
                    : app.displayName}
                </div>
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
              </div>
              {isAdmin && (
                <div className="mt-1 px-3">
                  <span className="text-xs text-muted-foreground mr-2">
                    Slug:
                  </span>
                  <InlineEditableField
                    value={app.slug}
                    onSave={(slug) =>
                      updateApp.mutate({ id: app.id, data: { slug } })
                    }
                    className="text-sm"
                  />
                </div>
              )}
              {/* Open button, then Quick Jump: the host you reach by pressing
                  it, and the deep link you reach by pasting an id. */}
              <div className="mt-3 flex flex-wrap items-stretch gap-3 px-3">
                {isAdmin ? (
                  <InlineEditableField
                    value={app.appUrl ?? ''}
                    onSave={(appUrl) =>
                      updateApp.mutate({ id: app.id, data: { appUrl } })
                    }
                    placeholder="App URL"
                    renderView={(url) =>
                      url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => recordClick(app.slug)}
                          className="inline-flex items-center gap-1 rounded-md py-1 text-sm text-blue-600 hover:bg-accent/30 hover:underline dark:text-blue-400 transition-all"
                        >
                          {displayUrl(url)}
                          <ExternalLink className="size-3.5 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )
                    }
                  />
                ) : app.appUrl ? (
                  <a
                    href={app.appUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => recordClick(app.slug)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium shadow-sm',
                      LEAVE_FILL,
                      LEAP,
                    )}
                    title={displayUrl(app.appUrl)}
                    aria-label={`Open ${app.displayName} in a new tab (${displayUrl(app.appUrl)})`}
                  >
                    {/* "Go to <host>": the verb makes it a thing you press and
                        the host says where to. The glyph adds "in a new tab". */}
                    <span className="max-w-[280px] truncate whitespace-nowrap">
                      Go to {displayUrl(app.appUrl)}
                    </span>
                    <ExternalLink className="size-3.5 shrink-0" />
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
                <QuickJumpBar app={app} />
              </div>
              {/* Updated/Added metadata moved to consolidated section before Sources (#55) */}
            </div>
          </div>
        </div>

        {/* Deprecation/Discouraged Warning */}
        {app.deprecated &&
          (() => {
            const deprecationType = app.deprecated.type || 'deprecated'
            const isDiscouraged = deprecationType === 'discouraged'
            return (
              <div
                className={
                  isDiscouraged
                    ? 'mt-6 p-4 border border-yellow-500/50 rounded-lg bg-yellow-50 dark:bg-yellow-950/20'
                    : 'mt-6 p-4 border border-destructive/50 rounded-lg bg-destructive/10'
                }
              >
                <h3
                  className={
                    isDiscouraged
                      ? 'text-sm font-semibold text-yellow-700 dark:text-yellow-500 mb-2'
                      : 'text-sm font-semibold text-destructive mb-2'
                  }
                >
                  {isDiscouraged
                    ? 'Usage discouraged'
                    : 'This application is deprecated'}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {app.deprecated.comment}
                </p>
                {replacementApp && (
                  <button
                    type="button"
                    onClick={() => onAppClick?.(replacementApp)}
                    className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
                  >
                    View replacement: {replacementApp.displayName}
                    <ExternalLink className="size-3" />
                  </button>
                )}
              </div>
            )
          })()}

        {/* Description */}
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-medium">Description</h3>
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
        </div>

        {/* Two-step access (#38 D): for a nested resource, show the parent-first
            prerequisite chain before this resource's own access instructions. */}
        <AccessPrerequisiteChain resource={app} onOpenParent={onAppClick} />

        {/* Access Request Section — what the app is comes first, then how to
            get into it. */}
        <AccessRequestSection app={app} approvalMethods={approvalMethods} />

        {/* Screenshots - Clickable preview */}
        {app.screenshotIds && app.screenshotIds.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-medium">
              Screenshots ({app.screenshotIds.length})
            </h3>
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
          </div>
        )}

        {/* Owner — who is responsible for this resource. Distinct from the
            access approver (who decides access requests); see domain model. */}
        {app.ownerPersonSlug && (
          <div className="mt-6">
            <h3 className="mb-1 text-sm font-medium">Owner</h3>
            <p className="mb-2 text-xs text-muted-foreground">
              Who is responsible for this resource
            </p>
            <PersonBadge slug={app.ownerPersonSlug} />
          </div>
        )}

        {/* Tier Variants and Sub-Resources */}
        <TiersAndSubResourcesPanel app={app} />

        {/* Links */}
        {app.links && app.links.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-1 text-xs font-medium text-muted-foreground">
              Links
            </h3>
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
          </div>
        )}

        {/* Tags */}
        {app.tags && app.tags.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-medium">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {app.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Teams */}
        {app.teams && app.teams.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-medium">Teams</h3>
            <div className="flex flex-wrap gap-2">
              {app.teams.map((team) => (
                <Badge key={team} variant="outline" className="text-xs">
                  {team}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Technical information: AI-facing fields, de-emphasized/collapsed */}
        {(app.aiPrompt || app.aiMemory) && (
          <Accordion type="single" collapsible className="mt-6">
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
                    <h4 className="mb-1 text-xs font-medium text-muted-foreground">
                      AI Prompt
                    </h4>
                    <p className="text-xs whitespace-pre-wrap">
                      {app.aiPrompt}
                    </p>
                  </div>
                )}
                {app.aiMemory && (
                  <div>
                    <h4 className="mb-1 text-xs font-medium text-muted-foreground">
                      AI Memory
                    </h4>
                    <p className="text-xs whitespace-pre-wrap">
                      {app.aiMemory}
                    </p>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {/* Metadata: Added / Updated */}
        {(app.createdAt || app.freshness?.lastCheckedAt) && (
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-1">
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
                {/* "Updated" means the content changed, not that a check ran -
                    entries predating the field have none, so fall back. */}
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
        )}

        {/* Sources */}
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-medium">Sources</h3>
          {isAdmin ? (
            <>
              <ul className="space-y-2">
                {displaySources.map((url, index) => {
                  const isDraft =
                    draftSource !== null && index === sourceUrls.length
                  return (
                    <li
                      key={isDraft ? 'draft' : `${index}-${url}`}
                      className="flex items-center gap-2 text-xs"
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
                <li key={index} className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground shrink-0 tabular-nums">
                    {index + 1}.
                  </span>
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary inline-flex items-center gap-1 truncate"
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
        </div>

        {/* Freshness now shown near the header (see "Updated …" above). */}

        <CommentsSection appSlug={app.slug} />
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
