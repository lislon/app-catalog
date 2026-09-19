import type { Resource } from '@igstack/app-catalog-backend-core'
import { ChevronDown, ExternalLink } from 'lucide-react'
import React from 'react'

import { useUrlSyncedState } from '~/modules/appCatalog/hooks/useUrlSyncedState'
import {
  buildQuickJumpUrl,
  groupQuickJumps,
  quickJumpFieldName,
  quickJumpShortTitle,
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

/** Fixed, so swapping destination cannot slide the field and Jump sideways. The
    picker carries the short title; the full one is in the menu, where you are
    choosing between systems. Longer shorts still ellipsis here. */
const PICKER = 'inline-flex w-44 shrink-0 items-center gap-1.5 bg-muted px-2'
const PICKER_TEXT = 'text-left text-xs font-semibold whitespace-nowrap'

/**
 * The leap, as env-hopper does it: the button lifts onto its toes on `:hover`
 * and crouches on `:active`. Deliberately NOT an on-click animation — these
 * links open a new tab, which takes focus the same instant, so a keyframe fired
 * on click runs in a backgrounded tab and the user only sees it on the way back.
 * Shared with the app's own "Go to <host>" button: both are leaving for the app.
 */
export const LEAP =
  'origin-bottom transition-transform duration-100 ease-out motion-safe:hover:-translate-y-[1.5px] motion-safe:active:translate-y-px motion-safe:active:scale-y-[0.92]'

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
      <div className="relative flex">
        <div
          className={cn(
            'group peer flex items-stretch overflow-hidden rounded-lg border border-input bg-card shadow-[inset_0_1px_2px_rgb(0_0_0/0.09)]',
            'focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/25',
            // Jump is a segment inside this clipping shell, so the SHELL leaps
            // -- a transform on the segment alone would be cut off, and the
            // field is going with it anyway. Same motion as LEAP, hung off the
            // armed Jump instead of off this element. Spelled out rather than
            // derived: Tailwind only compiles class names it can read.
            'origin-bottom transition-transform duration-100 ease-out',
            'motion-safe:has-[.qj-armed:hover]:-translate-y-[1.5px]',
            'motion-safe:has-[.qj-armed:active]:translate-y-px',
            'motion-safe:has-[.qj-armed:active]:scale-y-[0.92]',
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
                <span className="min-w-0 flex-1 truncate">
                  {quickJumpShortTitle(selected)}
                </span>
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
            <span
              title={selected.title}
              className={cn(PICKER, PICKER_TEXT, 'truncate')}
            >
              {quickJumpShortTitle(selected)}
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
            className={cn(
              'shrink-0 border-l border-border bg-transparent px-2.5 py-1.5 font-mono text-[0.8125rem] font-medium outline-none placeholder:font-sans placeholder:text-muted-foreground',
              // Hovering the dormant Jump lights up the field it is waiting on.
              'transition-[box-shadow,background-color] duration-150',
              'group-has-[.qj-dormant:hover]:bg-ring/10 group-has-[.qj-dormant:hover]:shadow-[inset_0_0_0_2px_var(--color-ring)]',
              'group-has-[.qj-dormant:hover]:placeholder:text-foreground',
            )}
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
              }
            }}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 border-l border-border px-3 text-xs font-bold whitespace-nowrap transition-colors',
              // `qj-armed`/`qj-dormant` carry no styles: they are the hooks the
              // shell and the field hang their `has-*` variants off, which an
              // attribute selector cannot be in a Tailwind variant.
              href
                ? 'qj-armed animate-button-pop bg-primary text-primary-foreground hover:bg-primary/90'
                : 'qj-dormant cursor-text bg-muted text-muted-foreground',
            )}
          >
            Jump
            <ExternalLink className="size-3.5 shrink-0" />
          </a>
        </div>

        {/* Hovering a button that does nothing is someone asking why. The answer
            points at the FIELD, not at the button under the cursor: the tail
            lands just inside the field's left edge (`left-44` = the picker's
            `w-44`) and the field lights up at the same time. */}
        <p
          aria-hidden
          className={cn(
            'pointer-events-none absolute top-[calc(100%+0.5rem)] left-44 z-30 m-0 flex items-center rounded-md bg-foreground px-2 py-1 text-xs font-semibold whitespace-nowrap text-background',
            'before:absolute before:-top-[3px] before:left-[0.9rem] before:size-2 before:rotate-45 before:rounded-[1px] before:bg-foreground',
            // `translate`, not `transform`: v4 utilities set the separate
            // `translate` property, which a transform transition never sees.
            '-translate-y-[3px] opacity-0 transition-[opacity,translate] duration-150',
            'peer-has-[.qj-dormant:hover]:translate-y-0 peer-has-[.qj-dormant:hover]:opacity-100',
            'peer-has-[.qj-dormant:focus-visible]:translate-y-0 peer-has-[.qj-dormant:focus-visible]:opacity-100',
          )}
        >
          Type a {selected.identity} here first
        </p>
      </div>
    </>
  )
}
