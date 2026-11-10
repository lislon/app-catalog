import type { SourceReference } from '@igstack/app-catalog-backend-core'
import { ExternalLink } from 'lucide-react'
import React from 'react'
import { SourcePulse } from './SourcePulse'
import { displayUrl } from '~/modules/appCatalog/utils/displayUrl'

interface SourcesListProps {
  sources: (string | SourceReference)[]
}

export function useSourceUrlsWithPulse(sources: (string | SourceReference)[]) {
  const urls: string[] = sources.map((s) => (typeof s === 'string' ? s : s.url))
  // The list renders bare URLs (they are editable as text), so the pulse has to
  // be looked up rather than carried alongside. Absent until the autoupdate loop
  // has seen the source — a freshly added one simply gets no mark.
  const pulseByUrl = React.useMemo(() => {
    const byUrl = new Map<string, NonNullable<SourceReference['pulse']>>()
    for (const source of sources) {
      if (typeof source !== 'string' && source.pulse) {
        byUrl.set(source.url, source.pulse)
      }
    }
    return byUrl
  }, [sources])

  return { urls, pulseByUrl }
}

export function SourcesList({ sources }: SourcesListProps) {
  const { urls: sourceUrls, pulseByUrl } = useSourceUrlsWithPulse(sources)

  return (
    <ul className="space-y-2">
      {sourceUrls.map((url, index) => (
        // `group` so hovering anywhere on the row fades that source's
        // track in — the mark sits in a right-hand column, and row
        // hover is what ties the two ends of a wide row together.
        <li key={index} className="group flex items-center gap-2 text-xs">
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
            <SourcePulse pulse={pulseByUrl.get(url)!} className="ml-auto" />
          )}
        </li>
      ))}
    </ul>
  )
}
