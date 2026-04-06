import type {
  AppForCatalog,
  GroupingTagDefinition,
} from '@igstack/app-catalog-backend-core'
import type { ColumnDef } from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { AppWindow, ExternalLink, Plus, Trash2, X } from 'lucide-react'
import React, { useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { cn } from '~/lib/utils'
import type {} from '~/types/table'
import { Badge } from '~/ui/badge'
import { Button } from '~/ui/button'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '~/ui/resizable'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/ui/table'
import { AccessRequestSection } from '../components/AccessRequestSection'
import { useUser } from '~/modules/auth'
import { InlineEditableField } from '../components/InlineEditableField'
import { ScreenshotGallery } from '../components/ScreenshotGallery'
import { useUpdateApp } from '../../hooks/useUpdateApp'
import { useAppCatalogContext } from '../../context/AppCatalogContext'
import { useAppClickHistory } from '../../hooks/useAppClickHistory'
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation'
import { highlightText } from '../../utils/searchApps'
import { TierVariantsSection } from '../components/TierVariantsSection'
import { SubResourcesSection } from '../components/SubResourcesSection'
import { getChildResources } from '../../utils/resolveHelpers'

export interface AppCatalogGridProps {
  apps: AppForCatalog[]
  selectedAppSlug?: string
  groupingDefinition?: GroupingTagDefinition
  onAppClick?: (app: AppForCatalog) => void
  /** Whether search is active (affects group sorting) */
  hasSearch?: boolean
  /** Search query for highlighting matches */
  searchQuery?: string
  /** Total count of apps before filtering */
  totalAppsCount?: number
  /** Callback to clear all filters and search */
  onClearFilters?: () => void
}

function getIconUrl(iconName: string): string {
  return `/api/icons/${iconName}`
}

function HighlightedText({
  text,
  searchQuery,
}: {
  text: string
  searchQuery?: string
}) {
  if (!searchQuery) {
    return <>{text}</>
  }

  const segments = highlightText(text, searchQuery)

  return (
    <>
      {segments.map((segment, index) =>
        segment.highlight ? (
          <mark
            key={index}
            className="bg-yellow-300 dark:bg-yellow-600/60 font-semibold text-gray-900 dark:text-gray-100"
          >
            {segment.text}
          </mark>
        ) : (
          <React.Fragment key={index}>{segment.text}</React.Fragment>
        ),
      )}
    </>
  )
}

function AppIcon({
  app,
  className,
}: {
  app: AppForCatalog
  className?: string
}) {
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

function AppScreenshot({ app }: { app: AppForCatalog }) {
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

function TiersAndSubResourcesPanel({ app }: { app: AppForCatalog }) {
  const { resources } = useAppCatalogContext()
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
          <SubResourcesSection subResources={appSubResources} />
        </div>
      )}
    </>
  )
}

function AppDetails({
  app,
  onAppClick,
  onClosePanel,
}: {
  app: AppForCatalog
  onAppClick?: (app: AppForCatalog) => void
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
        {/* Icon and Title */}
        <div className="border-b pb-6">
          <div className="flex items-center gap-3">
            <AppIcon app={app} className="size-16" />
            <div className="-mx-3 flex-1 min-w-0">
              <div className="flex items-center gap-2 px-3">
                <div className="text-2xl font-semibold min-w-0">
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
              <div className="mt-1 px-3">
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
                          {url.replace(/https?:\/\//g, '')}
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
                    className="inline-flex items-center gap-1 rounded-md py-1 text-sm text-blue-600 hover:bg-accent/30 hover:underline dark:text-blue-400 transition-all"
                  >
                    {app.appUrl.replace(/https?:\/\//g, '')}
                    <ExternalLink className="size-3.5 shrink-0 opacity-40 transition-opacity" />
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
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
          ) : (
            <p className="text-sm text-muted-foreground">
              {app.description || '—'}
            </p>
          )}
        </div>

        {/* Screenshots - Clickable preview */}
        {app.screenshotIds && app.screenshotIds.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-medium">
              Screenshots ({app.screenshotIds.length})
            </h3>
            <div
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => handleScreenshotClick(0)}
            >
              <AppScreenshot app={app} />
              {app.screenshotIds.length > 1 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Click to view all {app.screenshotIds.length} screenshots
                </p>
              )}
            </div>
          </div>
        )}

        {/* Access Request Section */}
        <AccessRequestSection app={app} approvalMethods={approvalMethods} />

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
                  {link.title || link.url.replace(/https?:\/\//g, '')}
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
                      <span className="text-muted-foreground shrink-0">
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
                              {val.replace(/https?:\/\//g, '')}
                              <ExternalLink className="size-3 shrink-0" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )
                        }
                      />
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
                  <span className="text-muted-foreground shrink-0">
                    {index + 1}.
                  </span>
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary inline-flex items-center gap-1 truncate"
                    >
                      {url.replace(/https?:\/\//g, '')}
                      <ExternalLink className="size-3 shrink-0" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
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

interface GroupedApps {
  groupName: string
  apps: AppForCatalog[]
}

function groupApps(
  apps: AppForCatalog[],
  groupingDef?: GroupingTagDefinition,
  hasSearch?: boolean,
): GroupedApps[] {
  // When search is active, skip grouping and preserve relevance order
  if (hasSearch) {
    return [{ groupName: 'All Apps', apps: [...apps] }]
  }

  if (!groupingDef) {
    // No grouping definition - sort alphabetically
    const sortedApps = [...apps].sort((a, b) =>
      a.displayName.localeCompare(b.displayName),
    )
    return [{ groupName: 'All Apps', apps: sortedApps }]
  }

  const grouped = new Map<string, AppForCatalog[]>()
  const ungrouped: AppForCatalog[] = []

  for (const app of apps) {
    const matchingTag = app.tags?.find((tag) =>
      tag.startsWith(`${groupingDef.prefix}:`),
    )

    if (matchingTag) {
      const value = matchingTag.split(':')[1]
      if (value) {
        const tagValue = groupingDef.values.find((v) => v.value === value)
        const displayName = tagValue?.displayName || value

        if (!grouped.has(displayName)) {
          grouped.set(displayName, [])
        }
        grouped.get(displayName)!.push(app)
      } else {
        ungrouped.push(app)
      }
    } else {
      ungrouped.push(app)
    }
  }

  const result: GroupedApps[] = []
  for (const [groupName, appsInGroup] of grouped) {
    // Sort alphabetically within each group
    const sortedGroupApps = appsInGroup.sort((a, b) =>
      a.displayName.localeCompare(b.displayName),
    )
    result.push({ groupName, apps: sortedGroupApps })
  }

  if (ungrouped.length > 0) {
    // Sort alphabetically
    const sortedUngrouped = ungrouped.sort((a, b) =>
      a.displayName.localeCompare(b.displayName),
    )
    result.push({ groupName: 'Other', apps: sortedUngrouped })
  }

  // Sort groups by app count descending
  result.sort((a, b) => b.apps.length - a.apps.length)

  return result
}

export function AppCatalogGrid({
  apps,
  selectedAppSlug,
  groupingDefinition,
  onAppClick,
  hasSearch = false,
  searchQuery,
  totalAppsCount,
  onClearFilters,
}: AppCatalogGridProps) {
  const selectedApp = selectedAppSlug
    ? apps.find((a) => a.slug === selectedAppSlug)
    : null

  const groupedApps = groupApps(apps, groupingDefinition, hasSearch)

  // Flatten grouped apps to get display order for keyboard navigation
  const appsInDisplayOrder = React.useMemo(
    () => groupedApps.flatMap((group) => group.apps),
    [groupedApps],
  )

  // Use keyboard navigation hook with apps in display order
  const { rowRefs } = useKeyboardNavigation({
    apps: appsInDisplayOrder,
    selectedAppSlug,
    onAppClick,
  })

  // Build a map of parentSlug -> matched child resource displayName for search annotation
  const { resources: allResources2 } = useAppCatalogContext()
  const matchedSubResourceMap = React.useMemo(() => {
    const map = new Map<string, string>()
    if (!searchQuery?.trim() || allResources2.length === 0) return map
    const queryTerms = searchQuery
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
    const allTermsMatch = (text: string): boolean =>
      queryTerms.every((term) => text.includes(term))

    for (const r of allResources2) {
      if (!r.parentSlug) continue
      if (map.has(r.parentSlug)) continue
      const nameMatch = allTermsMatch(r.displayName.toLowerCase())
      const aliasMatch = (r.aliases ?? []).some((a) =>
        allTermsMatch(a.toLowerCase()),
      )
      const descMatch = r.description
        ? allTermsMatch(r.description.toLowerCase())
        : false
      if (nameMatch || aliasMatch || descMatch) {
        map.set(r.parentSlug, r.displayName)
      }
    }
    return map
  }, [searchQuery, allResources2])

  // Define columns
  const columns = React.useMemo<ColumnDef<AppForCatalog>[]>(
    () => [
      {
        id: 'application',
        header: 'Application',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <AppIcon app={row.original} className="size-6" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  <HighlightedText
                    text={
                      row.original.abbreviation ||
                      row.original.displayName ||
                      'Unnamed App'
                    }
                    searchQuery={searchQuery}
                  />
                </span>
                {row.original.deprecated &&
                  (() => {
                    const deprecationType =
                      row.original.deprecated.type || 'deprecated'
                    return (
                      <span className="text-[0.7rem] text-muted-foreground">
                        (
                        {deprecationType === 'discouraged'
                          ? 'Discouraged'
                          : 'Deprecated'}
                        )
                      </span>
                    )
                  })()}
              </div>
              {row.original.abbreviation && (
                <span className="text-xs text-muted-foreground">
                  <HighlightedText
                    text={row.original.displayName}
                    searchQuery={searchQuery}
                  />
                </span>
              )}
            </div>
          </div>
        ),
        meta: {
          className: 'w-[300px]',
        },
      },
      {
        id: 'description',
        header: 'Description',
        cell: ({ row }) => (
          <div>
            <span className="text-sm text-muted-foreground line-clamp-2">
              <HighlightedText
                text={row.original.description || '—'}
                searchQuery={searchQuery}
              />
            </span>
            {matchedSubResourceMap.get(row.original.slug) && (
              <div className="text-xs text-primary mt-0.5">
                Matched sub-resource:{' '}
                {matchedSubResourceMap.get(row.original.slug)}
              </div>
            )}
          </div>
        ),
      },
    ],
    [searchQuery, matchedSubResourceMap],
  )

  // Create a single table instance with all apps
  const table = useReactTable({
    data: apps,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  })

  // Panel visibility state - derive from selectedApp and explicit close
  const [hasUserClosed, setHasUserClosed] = useState(false)

  // Auto-open when app is selected, unless user explicitly closed
  const isPanelOpen = selectedApp !== null && !hasUserClosed

  // Reset close flag when selectedApp changes
  React.useEffect(() => {
    if (selectedApp) {
      setHasUserClosed(false)
    }
  }, [selectedApp])

  // Auto-scroll to selected app (only on initial load)
  const hasScrolledRef = React.useRef(false)
  React.useEffect(() => {
    // Only scroll once on initial load if there's a selection
    if (selectedAppSlug && !hasScrolledRef.current) {
      const rowElement = rowRefs.current.get(selectedAppSlug)
      if (rowElement) {
        rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      hasScrolledRef.current = true
    }
  }, [selectedAppSlug, rowRefs])

  const handleAppClick = (app: AppForCatalog) => {
    onAppClick?.(app)
  }

  const handleClosePanel = () => {
    setHasUserClosed(true)
  }

  return (
    <ResizablePanelGroup orientation="horizontal" className="h-full w-full">
      {/* Left Panel - Table */}
      <ResizablePanel
        defaultSize={isPanelOpen ? 60 : 100}
        minSize={30}
        className="overflow-hidden"
      >
        <div className="h-full overflow-y-auto pr-2 pb-6 [scrollbar-gutter:stable]">
          <Table>
            <TableHeader className="sticky top-0 border-b bg-background z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={cn(
                        'px-4 py-3 text-left font-medium text-sm',
                        header.column.columnDef.meta?.className,
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {groupedApps.map((group) => (
                <React.Fragment key={group.groupName}>
                  {/* Group Header Row */}
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableCell
                      colSpan={columns.length}
                      className="px-4 py-6 sticky top-[49px] bg-muted/90 backdrop-blur z-10"
                    >
                      <div className="flex items-center justify-center">
                        <span className="font-bold text-lg tracking-widest uppercase leading-loose text-muted-foreground">
                          {group.groupName}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Group Apps */}
                  {group.apps.map((app) => {
                    const row = table
                      .getRowModel()
                      .rows.find((r) => r.id === app.id)
                    if (!row) return null

                    return (
                      <TableRow
                        key={row.id}
                        ref={(el) => {
                          if (el && row.original.slug) {
                            rowRefs.current.set(row.original.slug, el)
                          } else if (row.original.slug) {
                            rowRefs.current.delete(row.original.slug)
                          }
                        }}
                        onClick={() => handleAppClick(row.original)}
                        className={cn(
                          'border-b cursor-pointer transition-colors',
                          selectedApp?.id === row.original.id
                            ? 'bg-blue-100 dark:bg-blue-950 hover:bg-blue-200 dark:hover:bg-blue-900'
                            : 'hover:bg-muted/30',
                        )}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className={cn(
                              'px-4 py-4',
                              cell.column.columnDef.meta?.className,
                            )}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    )
                  })}
                </React.Fragment>
              ))}

              {/* Clear Filters Row */}
              {totalAppsCount &&
                totalAppsCount > apps.length &&
                onClearFilters && (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="px-4 py-8 text-center"
                    >
                      <Button
                        variant="outline"
                        onClick={onClearFilters}
                        className="gap-2"
                      >
                        <X className="h-4 w-4" />
                        Clear filters to show all apps ({totalAppsCount})
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
            </TableBody>
          </Table>
        </div>
      </ResizablePanel>

      {/* Right Panel - Details (only render when panel is open) */}
      {isPanelOpen && (
        <>
          {/* Resizable Handle */}
          <ResizableHandle withHandle />

          <ResizablePanel
            defaultSize={40}
            minSize={25}
            className="overflow-hidden"
          >
            <div className="h-full overflow-y-auto border-l bg-background pl-4">
              {selectedApp ? (
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 right-4 z-10 hover:bg-accent"
                    onClick={handleClosePanel}
                    aria-label="Close details panel"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                  <AppDetails
                    app={selectedApp}
                    onAppClick={onAppClick}
                    onClosePanel={handleClosePanel}
                  />
                </div>
              ) : null}
            </div>
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  )
}
