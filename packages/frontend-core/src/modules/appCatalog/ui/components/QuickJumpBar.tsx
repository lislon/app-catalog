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

/**
 * The destination picker. Fixed width on a desktop row, so swapping destination
 * cannot slide the field and Jump sideways; its own full-width line below `sm`,
 * where the three segments together do not fit in a phone's panel at all. It
 * carries the short title — the full one is in the menu, where you are choosing
 * between systems. Longer shorts still ellipsis here.
 */
const PICKER = [
  'inline-flex w-full shrink-0 items-center gap-1.5 rounded-t-lg border-b border-border bg-muted px-2',
  'text-left text-[0.8125rem] font-semibold whitespace-nowrap',
  'sm:w-44 sm:rounded-t-none sm:rounded-l-lg sm:border-b-0',
].join(' ')

/** One focus ring per focusable segment, or tabbing the row never says where
    you are: the shell's ring belongs to the field (below), these to the ends. */
const SEGMENT_FOCUS =
  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring'

/** Shared by Jump and by the app's own "Go to <host>" button. */
const JUMP = [
  'inline-flex shrink-0 items-center gap-1.5 rounded-br-lg border-l border-border px-3',
  'text-[0.8125rem] font-bold whitespace-nowrap sm:rounded-br-none sm:rounded-r-lg',
  SEGMENT_FOCUS,
].join(' ')

/**
 * The leap, as env-hopper does it: the button lifts onto its toes on `:hover`
 * and crouches on `:active`. Deliberately NOT an on-click animation — these
 * links open a new tab, which takes focus the same instant, so a keyframe fired
 * on click runs in a backgrounded tab and the user only sees it on the way back.
 *
 * The transition has to name `translate` and `scale`: in Tailwind v4 those
 * utilities set those separate properties, which a `transform` transition never
 * sees.
 */
export const LEAP =
  'origin-bottom transition-[background-color,translate,scale] duration-100 ease-out motion-safe:hover:-translate-y-[1.5px] motion-safe:active:translate-y-px motion-safe:active:scale-y-[0.92]'

/**
 * The brand fill for the two buttons that leave for the app. Darkened, because
 * `--primary` under `--primary-foreground` measures 3.8:1 — below WCAG AA, and
 * the conventional `bg-primary/90` hover made it worse by fading the fill
 * toward the card instead of darkening it.
 *
 * A token-level fix would be better and is a brand decision, not this
 * component's: every filled button in the app inherits the same ratio.
 */
export const LEAVE_FILL = [
  'bg-[color-mix(in_oklab,var(--color-primary)_90%,black)] text-primary-foreground',
  'hover:bg-[color-mix(in_oklab,var(--color-primary)_80%,black)]',
].join(' ')

/**
 * Quick Jump: `[ destination ▾ | id | Jump ]`, one control sitting next to the
 * app's own open button. The picker only names and swaps the destination; Jump
 * is the sole thing that navigates. Renders nothing for an app with no jumps.
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
    <div className="relative flex w-full sm:w-auto">
      <div
        className={cn(
          'group peer flex w-full flex-wrap items-stretch rounded-lg border border-input bg-card shadow-[inset_0_1px_2px_rgb(0_0_0/0.09)]',
          // The ring is the FIELD's, not the shell's: the picker and Jump are
          // focusable too and ringing the shell for all three says nothing.
          'has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-[3px] has-[input:focus-visible]:ring-ring/25',
          'sm:w-auto sm:flex-nowrap',
        )}
      >
        {jumps.length > 1 ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              title={`${selected.title} — choose a destination`}
              className={cn(
                PICKER,
                SEGMENT_FOCUS,
                'cursor-pointer transition-colors hover:bg-accent',
              )}
            >
              {/* Caret immediately after the label, not shoved to the far edge:
                  out there it reads as the field's boundary and leaves the
                  picker looking like a wide empty select. */}
              <span className="min-w-0 truncate">
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
          <span title={selected.title} className={cn(PICKER, 'truncate')}>
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
            // Grows into the row's leftovers below `sm`, where it shares a line
            // with Jump; its own fixed `size` from there up.
            'min-w-0 flex-1 border-border bg-transparent px-2.5 py-1.5 font-mono text-[0.8125rem] font-medium outline-none placeholder:font-sans placeholder:text-muted-foreground',
            'sm:flex-none sm:border-l',
            // Hovering the dormant Jump lights up the field it is waiting on.
            'transition-[box-shadow,background-color] duration-150',
            'group-has-[.qj-dormant:hover]:bg-ring/10 group-has-[.qj-dormant:hover]:shadow-[inset_0_0_0_2px_var(--color-ring)]',
            'group-has-[.qj-dormant:hover]:placeholder:text-foreground',
          )}
        />

        {/* A real <button> while dormant. An <a> without href is not focusable,
            so the whole "press it and it tells you to type" behaviour — and the
            hint's :focus-visible branch — would have been mouse-only. */}
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            // Title, not the url: the browser already puts the url in the
            // status bar, and some of these are 250 characters long. It doubles
            // as the full text when the picker has ellipsised it.
            title={`Jump to ${selected.title}`}
            className={cn(JUMP, LEAP, LEAVE_FILL, 'animate-button-pop')}
          >
            Jump
            <ExternalLink className="size-3.5 shrink-0" />
          </a>
        ) : (
          <button
            type="button"
            title={`Enter a ${selected.identity} first`}
            onClick={() => inputRef.current?.focus()}
            // Tinted toward the action rather than greyed: on `bg-muted` it was
            // the picker's twin, so the row read as two dropdowns around a
            // field and nothing in it looked raised.
            className={cn(
              JUMP,
              'qj-dormant cursor-text bg-primary/10 text-muted-foreground',
            )}
          >
            Jump
            <ExternalLink className="size-3.5 shrink-0" />
          </button>
        )}
      </div>

      {/* Hovering a button that does nothing is someone asking why. The answer
          points at the FIELD, not at the button under the cursor: the tail
          lands just inside the field's left edge (`left-44` = the picker's
          `w-44`; below `sm` the field starts the line) and the field lights up
          at the same time. */}
      <p
        aria-hidden
        className={cn(
          'pointer-events-none absolute top-[calc(100%+0.5rem)] left-0 z-30 m-0 flex items-center rounded-md bg-foreground px-2 py-1 text-xs font-semibold whitespace-nowrap text-background sm:left-44',
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
  )
}
