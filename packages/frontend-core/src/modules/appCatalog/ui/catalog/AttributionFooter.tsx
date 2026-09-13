import { ExternalLink, Github } from 'lucide-react'
import { useUiSettings } from '~/context/UiSettingsContext'

/**
 * Subtle attribution line for the home view (author + repo links). Content is
 * supplied by the consuming app via `UiSettings.attribution` — the OSS core
 * hard-codes nothing company-specific. Renders nothing when unset.
 *
 * `kind: 'oss'` links get a GitHub mark; everything else gets a generic
 * external-link icon (proprietary repos, etc.).
 */
export function AttributionFooter() {
  const { attribution } = useUiSettings()
  if (!attribution || (!attribution.madeBy && !attribution.links?.length)) {
    return null
  }

  return (
    <footer className="mt-16 border-t border-border/60 pt-5 text-center text-[12.5px] text-muted-foreground">
      {attribution.madeBy && <span>{attribution.madeBy}</span>}
      {attribution.links && attribution.links.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          {attribution.links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-primary transition-colors"
            >
              {link.kind === 'oss' ? (
                <Github className="size-3.5" />
              ) : (
                <ExternalLink className="size-3.5" />
              )}
              {link.label}
            </a>
          ))}
        </div>
      )}
    </footer>
  )
}
