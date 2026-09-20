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

/** Whether the open button should stand down for this app's Quick Jump. */
export function hasQuickJumps(app: Resource): boolean {
  return groupQuickJumps(app).some((group) => group.jumps.length > 0)
}

/**
 * One horizontal inset and one icon gap for every segment AND for the open
 * button, so the two seams either side of the field measure the same.
 *
 * Vertical padding is deliberately absent: height comes from a `min-h` on each
 * segment. Borrowing it from a sibling through `items-stretch` is what left the
 * picker a 20.5px tap target once it wrapped onto its own line, and what made the
 * row 33.5px on an app with jumps but 32px on an app without.
 */
const SEGMENT =
  'inline-flex items-center gap-1.5 px-3 text-sm whitespace-nowrap'

/** One focus ring per focusable segment, or tabbing the row never says where
    you are: the shell's ring belongs to the field (below), these to the ends. */
const SEGMENT_FOCUS =
  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring'

/**
 * The destination picker. Sized to the app's WIDEST short title (see the ghost
 * below), not to a constant: a constant was simultaneously 100px too narrow for
 * the long titles and three quarters empty on an app with one short one. Widest,
 * rather than current, is what keeps the field and Jump from sliding sideways
 * when the destination changes — the only thing the constant was protecting.
 *
 * Its own full-width line below `sm`, where the three segments together do not
 * fit in a phone's panel at all. It carries the short title — the full one is in
 * the menu, where you are choosing between systems.
 */
const PICKER = [
  SEGMENT,
  // `calc(var(--radius)_-_1px)` is the shell's radius less its own border, so the
  // inner corners are concentric with the outer ones. Written out rather than
  // interpolated from a constant: Tailwind reads these class names out of the
  // source text, and a template hole is not a class name.
  'w-full min-h-10 shrink-0 rounded-t-[calc(var(--radius)_-_1px)] border-b border-border bg-muted text-left font-semibold',
  'sm:w-auto sm:min-h-8 sm:max-w-[min(20rem,100%)] sm:rounded-t-none sm:rounded-l-[calc(var(--radius)_-_1px)] sm:border-b-0',
].join(' ')

const JUMP = [
  SEGMENT,
  'min-h-8 shrink-0 rounded-br-[calc(var(--radius)_-_1px)] border-l border-border font-bold sm:rounded-br-none sm:rounded-r-[calc(var(--radius)_-_1px)]',
  SEGMENT_FOCUS,
].join(' ')

/**
 * The leap, as a free-standing button does it: it lifts onto its toes on
 * `:hover` and crouches on `:active`. Deliberately NOT an on-click animation —
 * these links open a new tab, which takes focus the same instant, so a keyframe
 * fired on click runs in a backgrounded tab and the user only sees it on the way
 * back.
 *
 * The transition has to name `translate` and `scale`: in Tailwind v4 those
 * utilities set those separate properties, which a `transform` transition never
 * sees.
 *
 * This belongs to the open button ALONE. Jump is welded into a bordered frame,
 * where the same lift covered the shell's top border along its whole width and
 * the crouch opened 3.5px of card above it while overhanging the bottom. A
 * segment presses inward instead — see `JUMP_FILL`.
 */
export const LEAP =
  'origin-bottom transition-[background-color,translate,scale] duration-100 ease-out motion-safe:hover:-translate-y-[1.5px] motion-safe:active:translate-y-px motion-safe:active:scale-y-[0.92]'

/**
 * The brand fill for a button that leaves for the app. Darkened, because
 * `--primary` under `--primary-foreground` measures 3.8:1 — below WCAG AA. 90%
 * measured 4.56:1, which clears AA by 0.06 at a size where bold does not count
 * as large text; 85% measures 5.19:1.
 *
 * A token-level fix would be better and is a brand decision, not this
 * component's: every filled button in the app inherits the same ratio.
 */
export const LEAVE_FILL = [
  'bg-[color-mix(in_oklab,var(--color-primary)_85%,black)] text-primary-foreground',
  'hover:bg-[color-mix(in_oklab,var(--color-primary)_75%,black)]',
].join(' ')

/**
 * The open button when the app also has a Quick Jump. A row holds exactly ONE
 * solid brand fill and it belongs on the submit — the one element in a
 * field-shaped control that has to announce "this acts on what you typed".
 * Sharing the fill made the two read as a single four-part blob.
 *
 * The button keeps its primacy through position and its self-describing label,
 * not through being the loudest thing in the row. The branch is decided by the
 * app's data, never by the input's value: the hierarchy must not flicker while
 * the user types.
 *
 * The border is not decoration. `--secondary` and the picker's `--muted` sit
 * 0.015 apart in lightness, so without it the button and the shell's first
 * segment read as one continuous panel straight across the gap — the same
 * failure again, in grey.
 */
export const QUIET_FILL =
  'border border-border bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground'

/** Jump's fill: the leave fill, pressed inward rather than crouching. */
const JUMP_FILL = [
  LEAVE_FILL,
  'active:bg-[color-mix(in_oklab,var(--color-primary)_68%,black)]',
  'active:shadow-[inset_0_2px_3px_rgb(0_0_0/0.22)]',
  'transition-[background-color,box-shadow] duration-150 ease-out',
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
  const hintId = React.useId()

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

  // What the picker is sized to. Longest by characters rather than by measured
  // text: close enough at one weight and one size, and it costs no layout pass.
  const widest = jumps
    .map(quickJumpShortTitle)
    .reduce((longest, title) =>
      title.length > longest.length ? title : longest,
    )

  return (
    <div
      className={cn(
        'group flex w-full max-w-full flex-wrap items-stretch rounded-lg border border-input bg-card shadow-[inset_0_1px_2px_rgb(0_0_0/0.09)]',
        // Any segment, not just the field: the picker and Jump are focusable
        // too, and a shell that stays unlit for two of its three ends reads as
        // if tabbing had left the control.
        'has-[:focus-visible]:border-ring has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/25',
        'sm:w-auto',
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
            {/* The shown label and an invisible copy of the widest one share a
                single grid cell, so the column is as wide as the widest and the
                segment cannot change width when the destination changes.

                The cap has to be on this box, not only on the segment: a
                `max-width` on a flex item does not clamp that item's
                max-content contribution, so the shell's own width would still
                be computed from the uncapped label and leave dead card-coloured
                space after Jump. */}
            <span className="grid min-w-0 max-w-[296px]">
              {/* Caret inside the shown cell, immediately after the label — as
                  a sibling of the whole box it would be stranded at the far
                  edge on every destination but the widest, where it reads as
                  the field's boundary and leaves the picker looking like a wide
                  empty select. The ghost reserves its width instead. */}
              <span className="flex min-w-0 items-center gap-1.5 [grid-area:1/1]">
                <span className="truncate">
                  {quickJumpShortTitle(selected)}
                </span>
                <ChevronDown className="size-4 shrink-0 text-foreground/70" />
              </span>
              {/* Omitted when the widest destination is the one on screen: the
                  shown cell already measures that wide, and a second copy of
                  the same words is one a text query has to disambiguate. */}
              {widest !== quickJumpShortTitle(selected) && (
                <span
                  aria-hidden
                  // 16px caret + the 6px gap it sits behind.
                  className="invisible h-0 pr-[22px] whitespace-nowrap [grid-area:1/1]"
                >
                  {widest}
                </span>
              )}
            </span>
          </DropdownMenuTrigger>
          {/* Portalled, never narrower than the trigger, and sized to its
              content beyond that: the trigger ellipsises, the menu never does. */}
          <DropdownMenuContent
            align="start"
            sideOffset={6}
            className="max-w-[min(90vw,34rem)] min-w-[var(--radix-dropdown-menu-trigger-width)]"
          >
            <DropdownMenuRadioGroup
              value={quickJumpSlug(selected)}
              onValueChange={setSlug}
            >
              {identities.map((group) => (
                <React.Fragment key={group.identity}>
                  <DropdownMenuLabel className="px-2 py-1 text-[0.65rem] font-extrabold tracking-wider text-muted-foreground uppercase">
                    {group.identity}
                  </DropdownMenuLabel>
                  {group.jumps.map((jump) => (
                    <DropdownMenuRadioItem
                      key={quickJumpSlug(jump)}
                      value={quickJumpSlug(jump)}
                      // Concentric with the menu: 8px inside a 12px box with
                      // 4px of padding.
                      className="rounded-[8px] pl-7 whitespace-nowrap"
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

      {/* The field owns a positioning context so the hint below can be anchored
          to it. The input is taken out of flow inside it: an `<input>` keeps an
          intrinsic 20-character width that wins inside an auto-width flex row,
          and the field's width is a design decision, not a font metric. */}
      <div
        className={cn(
          'relative flex min-h-8 w-[170px] min-w-[120px] flex-[1_1_170px] border-border',
          // Grows into the row's leftovers below `sm`, where it shares a line
          // with Jump. It must NOT grow from `sm` up: the shell is auto-width
          // there, so growing fills nothing but does hand the field the
          // picker's clamped-away max-content overflow.
          'sm:flex-[0_1_170px] sm:border-l',
        )}
      >
        <input
          ref={inputRef}
          type="text"
          // Namespaced per identity: the browser remembers values typed for this
          // identifier and offers them on every app that asks for it.
          name={quickJumpFieldName(selected.identity)}
          autoComplete="on"
          aria-label={selected.identity}
          // Bare identity, not "Enter <identity>": the verb costs ~40px of a
          // 170px field that the longest identifiers need.
          placeholder={selected.identity}
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
            'absolute inset-0 h-full w-full bg-transparent px-3 font-mono text-sm font-medium outline-none placeholder:font-sans placeholder:text-muted-foreground',
            // Hovering the dormant Jump lights up the field it is waiting on.
            'transition-[box-shadow,background-color] duration-150',
            'group-has-[.qj-dormant:hover]:bg-ring/10 group-has-[.qj-dormant:hover]:shadow-[inset_0_0_0_2px_var(--color-ring)]',
            'group-has-[.qj-dormant:hover]:placeholder:text-foreground',
          )}
        />

        {/* Hovering a button that does nothing is someone asking why. The answer
            points at the FIELD, not at the button under the cursor — which is
            why it hangs off the field's own box rather than off a hard-coded
            picker width that stopped being true once the picker was sized to its
            content. The field lights up at the same time.

            Not `aria-hidden`: it is the dormant button's description, which is
            also why that button no longer carries a `title` saying the same
            thing in different words. */}
        <p
          id={hintId}
          className={cn(
            'pointer-events-none absolute top-[calc(100%+0.5rem)] left-0 z-30 m-0 flex items-center rounded-md bg-foreground px-2 py-1 text-xs font-semibold whitespace-nowrap text-background',
            'before:absolute before:-top-[3px] before:left-[0.9rem] before:size-2 before:rotate-45 before:rounded-[1px] before:bg-foreground',
            // `translate`, not `transform`: v4 utilities set the separate
            // `translate` property, which a transform transition never sees.
            '-translate-y-[3px] opacity-0 transition-[opacity,translate] duration-150',
            'group-has-[.qj-dormant:hover]:translate-y-0 group-has-[.qj-dormant:hover]:opacity-100',
            'group-has-[.qj-dormant:focus-visible]:translate-y-0 group-has-[.qj-dormant:focus-visible]:opacity-100',
          )}
        >
          Type a {selected.identity} here first
        </p>
      </div>

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
          className={cn(JUMP, JUMP_FILL)}
        >
          Jump
          <ExternalLink className="size-3.5 shrink-0" />
        </a>
      ) : (
        <button
          type="button"
          aria-describedby={hintId}
          onClick={() => inputRef.current?.focus()}
          // Tinted toward the action rather than greyed: on `bg-muted` it was
          // the picker's twin, so the row read as two dropdowns around a
          // field and nothing in it looked raised.
          className={cn(
            JUMP,
            'qj-dormant cursor-text bg-primary/12 text-muted-foreground',
          )}
        >
          Jump
          <ExternalLink className="size-3.5 shrink-0" />
        </button>
      )}
    </div>
  )
}
