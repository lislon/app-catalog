import type { QuickJump, Resource } from '@igstack/app-catalog-backend-core'
import { Pin, Rabbit, Settings2 } from 'lucide-react'
import React from 'react'

import { cn } from '~/lib/utils'
import { Checkbox } from '~/ui/checkbox'
import { Input } from '~/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '~/ui/popover'
import {
  buildQuickJumpUrl,
  groupQuickJumps,
  quickJumpFieldName,
} from '~/modules/appCatalog/utils/quickJump'

/**
 * Per-user, per-app preferences. Which identities to render and whether to hoist
 * the section to the top of the card — a browser-local display choice, so it
 * lives in localStorage rather than costing a table and an authenticated route.
 */
interface QuickJumpPrefs {
  /** Keep the section at the top of the app card. */
  pinned?: boolean
  /** Identity labels to render. Absent = the first identity only. */
  shown?: string[]
}

function prefsKey(slug: string) {
  return `ac:quickjump:${slug}`
}

function readPrefs(slug: string): QuickJumpPrefs {
  try {
    const raw = localStorage.getItem(prefsKey(slug))
    return raw ? (JSON.parse(raw) as QuickJumpPrefs) : {}
  } catch {
    return {}
  }
}

function writePrefs(slug: string, prefs: QuickJumpPrefs) {
  try {
    localStorage.setItem(prefsKey(slug), JSON.stringify(prefs))
  } catch {
    // Private mode / full quota: the session still works, just doesn't persist.
  }
}

/**
 * One jump button. Disabled until its identity has a value: greyed and dashed,
 * so the empty input above reads as the thing to do first. The green JUMP tell
 * only shows on hover — one per row is repetition, not signal.
 */
function JumpButton({
  jump,
  value,
  appUrl,
}: {
  jump: QuickJump
  value: string
  appUrl?: string
}) {
  const trimmed = value.trim()
  const href = trimmed ? buildQuickJumpUrl(jump, trimmed, appUrl) : null

  return (
    <a
      href={href ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={href ? undefined : true}
      title={href ?? `Fill in ${jump.identity} first`}
      className={cn(
        'group/jump flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs font-semibold transition-colors',
        href
          ? 'animate-button-pop bg-card shadow-sm hover:bg-accent/40'
          : 'pointer-events-none border-dashed bg-muted text-muted-foreground opacity-70',
      )}
    >
      <span className="min-w-0 flex-1 wrap-anywhere">
        {jump.title}
        {trimmed && <span className="ml-1 font-mono">{trimmed}</span>}
      </span>
      <span
        className={cn(
          'flex shrink-0 origin-bottom items-center gap-1 text-hopper opacity-0 transition-[opacity,transform]',
          'group-hover/jump:-translate-x-0.5 group-hover/jump:translate-y-0.5 group-hover/jump:rotate-2 group-hover/jump:scale-y-90',
          'group-hover/jump:opacity-100 group-focus-visible/jump:opacity-100 motion-reduce:transform-none',
        )}
      >
        <span className="text-[0.65rem] font-extrabold tracking-widest">
          JUMP
        </span>
        <Rabbit className="size-4" />
      </span>
    </a>
  )
}

/**
 * Quick Jump: paste an id, open the matching page. One column per identity the
 * app's jumps ask for; only the identities the user keeps are rendered, the rest
 * are one click away behind Configure.
 */
export function QuickJumpSection({ app }: { app: Resource }) {
  const identities = React.useMemo(() => groupQuickJumps(app), [app])
  const [prefs, setPrefs] = React.useState<QuickJumpPrefs>(() =>
    readPrefs(app.slug),
  )
  const [values, setValues] = React.useState<Record<string, string>>({})

  // Re-read when the panel moves to another app — one key per slug.
  React.useEffect(() => {
    setPrefs(readPrefs(app.slug))
    setValues({})
  }, [app.slug])

  if (identities.length === 0) return null

  const savePrefs = (next: QuickJumpPrefs) => {
    setPrefs(next)
    writePrefs(app.slug, next)
  }

  const shown = prefs.shown ?? identities.slice(0, 1).map((i) => i.identity)
  const visible = identities.filter((i) => shown.includes(i.identity))

  const toggleShown = (identity: string) =>
    savePrefs({
      ...prefs,
      shown: shown.includes(identity)
        ? shown.filter((s) => s !== identity)
        : [...shown, identity],
    })

  return (
    <div className={cn('mt-6', prefs.pinned && 'order-[-1]')}>
      <div className="mb-2 flex items-center gap-2">
        <Rabbit className="size-4 shrink-0 text-hopper" />
        <h3 className="text-sm font-medium">Quick Jump</h3>
        <button
          type="button"
          onClick={() => savePrefs({ ...prefs, pinned: !prefs.pinned })}
          title={
            prefs.pinned
              ? 'Unpin section'
              : 'Pin section — keep Quick Jump at the top of this card'
          }
          aria-pressed={prefs.pinned ?? false}
          className={cn(
            'rounded-sm p-0.5 transition-opacity hover:bg-muted',
            prefs.pinned
              ? 'text-primary'
              : 'text-muted-foreground opacity-50 hover:opacity-100',
          )}
        >
          <Pin className="size-3.5" />
        </button>
        {prefs.pinned && (
          <span className="text-xs font-semibold text-primary">
            pinned to top
          </span>
        )}

        {/* Nothing to configure with a single identity. */}
        {identities.length > 1 && (
          <Popover>
            <PopoverTrigger className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-primary/45 bg-accent/45 px-2.5 py-1 text-xs font-bold shadow-sm transition-colors hover:border-primary hover:bg-accent/80">
              <Settings2 className="size-3.5 text-primary" />
              Configure ({visible.length}/{identities.length})
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-1.5">
              <p className="px-1.5 pt-0.5 pb-1.5 text-[0.7rem] text-muted-foreground">
                Tick an ID to show it on this card.
              </p>
              {identities.map(({ identity, jumps }) => (
                <label
                  key={identity}
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-1.5 py-1.5 text-sm hover:bg-muted"
                >
                  <Checkbox
                    checked={shown.includes(identity)}
                    onCheckedChange={() => toggleShown(identity)}
                  />
                  {identity}
                  <span className="ml-auto font-mono text-[0.7rem] text-muted-foreground">
                    {jumps.length}
                  </span>
                </label>
              ))}
            </PopoverContent>
          </Popover>
        )}
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Paste an ID and open the matching page.
      </p>

      {visible.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No IDs shown — pick one under Configure.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map(({ identity, jumps }) => {
            const value = values[identity] ?? ''
            return (
              <div key={identity} className="flex min-w-0 flex-col gap-2">
                <label
                  className="truncate text-xs font-bold"
                  htmlFor={`qj-${app.slug}-${identity}`}
                >
                  {identity}
                </label>
                <Input
                  id={`qj-${app.slug}-${identity}`}
                  // Namespaced per identity: the browser remembers values typed
                  // for this identifier and offers them on every app using it.
                  name={quickJumpFieldName(identity)}
                  autoComplete="on"
                  placeholder={identity}
                  className="bg-card font-mono"
                  value={value}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [identity]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    const first = jumps[0]
                    if (e.key !== 'Enter' || !first) return
                    if (!e.currentTarget.value.trim()) return
                    const url = buildQuickJumpUrl(
                      first,
                      e.currentTarget.value,
                      app.appUrl,
                    )
                    if (url) window.open(url, '_blank', 'noopener,noreferrer')
                  }}
                />
                {jumps.map((jump) => (
                  <JumpButton
                    key={`${jump.title}:${jump.url}`}
                    jump={jump}
                    value={value}
                    appUrl={app.appUrl}
                  />
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
