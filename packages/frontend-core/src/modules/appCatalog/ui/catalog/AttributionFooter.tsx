import { ExternalLink, Github, Slack } from 'lucide-react'
import { useUiSettings } from '~/context/UiSettingsContext'

/**
 * Support channel as an icon + `#name`, linked through
 * `UiSettings.chatChannelUrlTemplate` (the same template that turns `#name`
 * mentions in catalog text into links). Plain text when no template is set —
 * a deployment on another chat platform still gets the channel name.
 */
function SupportChannel({ name }: { name: string }) {
  const { chatChannelUrlTemplate } = useUiSettings()
  const label = (
    <>
      <Slack className="size-3.5" />
      {`#${name}`}
    </>
  )

  if (!chatChannelUrlTemplate) {
    return <span className="inline-flex items-center gap-1">{label}</span>
  }

  return (
    <a
      href={chatChannelUrlTemplate.replace('{name}', name)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 hover:text-primary transition-colors"
    >
      {label}
    </a>
  )
}

/**
 * Subtle attribution line (author, support channel, repo links). Content is
 * supplied by the consuming app via `UiSettings.attribution` — the OSS core
 * hard-codes nothing company-specific. Renders nothing when unset.
 *
 * `kind: 'oss'` links get a GitHub mark; everything else gets a generic
 * external-link icon (proprietary repos, etc.).
 *
 * `variant`: `page` is the home-view footer, `popover` the compact block at the
 * bottom of the header's version popover.
 */
export function AttributionFooter({
  variant = 'page',
}: {
  variant?: 'page' | 'popover'
}) {
  const { attribution } = useUiSettings()
  if (
    !attribution ||
    (!attribution.madeBy &&
      !attribution.supportChannel &&
      !attribution.links?.length)
  ) {
    return null
  }

  const isPopover = variant === 'popover'
  const Wrapper = isPopover ? 'div' : 'footer'
  const hasRow = attribution.supportChannel || attribution.links?.length

  return (
    <Wrapper
      className={
        isPopover
          ? 'border-t bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground'
          : 'mt-4 border-t border-border/60 pt-5 text-center text-[12.5px] text-muted-foreground'
      }
    >
      {attribution.madeBy && <span>{attribution.madeBy}</span>}
      {hasRow && (
        <div
          className={
            isPopover
              ? 'mt-1 flex flex-wrap items-center gap-x-3 gap-y-1'
              : 'mt-1.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1'
          }
        >
          {attribution.supportChannel && (
            <SupportChannel name={attribution.supportChannel} />
          )}
          {attribution.links?.map((link) => (
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
    </Wrapper>
  )
}
