import type { Resource } from '@igstack/app-catalog-backend-core'
import { ChevronDown, ExternalLink } from 'lucide-react'
import React from 'react'

import { useUrlSyncedState } from '~/modules/appCatalog/hooks/useUrlSyncedState'
import {
  buildQuickJumpUrl,
  groupQuickJumps,
  quickJumpFieldName,
  quickJumpSlug,
} from '~/modules/appCatalog/utils/quickJump'
import { cn } from '~/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '~/ui/dropdown-menu'

/** Fixed, so swapping destination cannot slide the field and Jump sideways.
    Longer titles ellipsis here and show in full in the menu. */
const PICKER = 'inline-flex w-48 shrink-0 items-center gap-1.5 bg-muted px-2'
const PICKER_TEXT = 'text-left text-xs font-semibold whitespace-nowrap'

/**
 * Quick Jump: `[ destination ▾ | id | Jump ]`, one control sitting next to the
 * app's own open button. The picker only names and swaps the destination; Jump
 * is the sole thing that navigates. Renders nothing for an app with no jumps.
 *
 * Returns a fragment — a hairline separator plus the control — so it drops into
 * the header's flex row beside the open button.
 */
export function QuickJumpBar({ app }: { app: Resource }) {
  const identities = React.useMemo(() => groupQuickJumps(app), [app])
  const jumps = React.useMemo(
    () => identities.flatMap((group) => group.jumps),
    [identities],
  )
  // The chosen destination lives in the url (`?qj=tracker.view-case`), so a
  // "use this one" link is shareable. Empty = the app's first jump.
  const [slug, setSlug] = useUrlSyncedState<string>({
    key: 'qj',
    defaultValue: '',
    encode: (value) => value || undefined,
  })
  const [value, setValue] = React.useState('')
  const [hopping, setHopping] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // A typed id belongs to the app it was typed on.
  React.useEffect(() => setValue(''), [jumps])

  // A `?qj=` naming another app's jump would silently resolve to this app's
  // first one, leaving the url claiming something untrue.
  React.useEffect(() => {
    if (slug && !jumps.some((jump) => quickJumpSlug(jump) === slug)) setSlug('')
  }, [jumps, slug, setSlug])

  if (jumps.length === 0) return null

  const selected =
    jumps.find((jump) => quickJumpSlug(jump) === slug) ?? jumps[0]
  if (!selected) return null

  const trimmed = value.trim()
  // Never null in practice: groupQuickJumps already dropped the jumps this app
  // cannot build a url for.
  const href =
    (trimmed ? buildQuickJumpUrl(selected, trimmed, app.appUrl) : null) ??
    undefined

  // Sized once from the longest identifier this app asks for, not per
  // selection: the field must not resize when the destination changes. `size`
  // is in characters of the input's own font, so it survives a type-scale change.
  const fieldChars =
    Math.max(...jumps.map((jump) => jump.identity.length), 8) + 8

  return (
    <>
      <span aria-hidden className="mx-1 w-px self-stretch bg-border" />
      <div
        onAnimationEnd={() => setHopping(false)}
        className={cn(
          'flex items-stretch overflow-hidden rounded-lg border border-input bg-card shadow-[inset_0_1px_2px_rgb(0_0_0/0.09)]',
          'focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/25',
          hopping && 'origin-bottom animate-qj-hop',
        )}
      >
        {jumps.length > 1 ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              title={`${selected.title} — choose a destination`}
              className={cn(
                PICKER,
                PICKER_TEXT,
                'cursor-pointer transition-colors hover:bg-accent',
              )}
            >
              <span className="min-w-0 flex-1 truncate">{selected.title}</span>
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
            </DropdownMenuTrigger>
            {/* Portalled and sized to its content: the trigger ellipsises, the
                menu never does. */}
            <DropdownMenuContent
              align="start"
              className="max-w-[min(90vw,34rem)]"
            >
              <DropdownMenuRadioGroup
                value={quickJumpSlug(selected)}
                onValueChange={setSlug}
              >
                {identities.map((group) => (
                  <React.Fragment key={group.identity}>
                    <DropdownMenuLabel className="text-[0.65rem] font-extrabold tracking-wider text-muted-foreground uppercase">
                      {group.identity}
                    </DropdownMenuLabel>
                    {group.jumps.map((jump) => (
                      <DropdownMenuRadioItem
                        key={quickJumpSlug(jump)}
                        value={quickJumpSlug(jump)}
                        className="whitespace-nowrap"
                      >
                        {jump.title}
                      </DropdownMenuRadioItem>
                    ))}
                  </React.Fragment>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span className={cn(PICKER, PICKER_TEXT, 'truncate')}>
            {selected.title}
          </span>
        )}

        <input
          ref={inputRef}
          type="text"
          size={fieldChars}
          // Namespaced per identity: the browser remembers values typed for this
          // identifier and offers them on every app that asks for it.
          name={quickJumpFieldName(selected.identity)}
          autoComplete="on"
          aria-label={selected.identity}
          placeholder={`Enter ${selected.identity}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          // Selecting on focus rather than on click, or a second click inside
          // could never place a caret.
          onFocus={(e) => e.currentTarget.select()}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || !href) return
            window.open(href, '_blank', 'noopener,noreferrer')
          }}
          className="shrink-0 border-l border-border bg-transparent px-2.5 py-1.5 font-mono text-[0.8125rem] font-medium outline-none placeholder:font-sans placeholder:text-muted-foreground"
        />

        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={href ? undefined : true}
          title={
            href
              ? `${selected.title} → ${href}`
              : `Enter a ${selected.identity} first`
          }
          onClick={(e) => {
            // Dormant, but still clickable: pressing it says "type here".
            if (!href) {
              e.preventDefault()
              inputRef.current?.focus()
              return
            }
            setHopping(true)
          }}
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 border-l border-border px-3 text-xs font-bold whitespace-nowrap transition-colors',
            href
              ? 'animate-button-pop bg-primary text-primary-foreground hover:bg-primary/90'
              : 'cursor-text bg-muted text-muted-foreground',
          )}
        >
          Jump
          <ExternalLink className="size-3.5 shrink-0" />
        </a>
      </div>
    </>
  )
}
