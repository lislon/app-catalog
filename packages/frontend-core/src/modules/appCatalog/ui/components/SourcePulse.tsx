/**
 * The per-source pulse mark: one small inline SVG in the Sources list saying how
 * volatile a source is, whether its reading is current, when it last changed and
 * when it was last checked.
 *
 * Two channels, kept separate on purpose: **shape carries volatility** (where the
 * ticks fall on a real 90-day axis — a burst of churn looks like a burst) and
 * **colour carries freshness**. Colour never carries it alone: the freshness
 * circle also goes hollow → filled → filled-with-ring, and the tooltip prints the
 * words. Those three hexes are the fixed status palette and are deliberately NOT
 * themed — a status colour that shifts with the theme stops being a status.
 *
 * At rest only the freshness circle is drawn, inside a fixed-width slot, so a list
 * of sources reads as a quiet column and hovering cannot reflow the row. Hover or
 * keyboard focus fades the track in and opens a tooltip that doubles as the
 * legend: every row is prefixed by the very glyph it explains.
 */
import type { SourcePulse as SourcePulseData } from '@igstack/app-catalog-backend-core'
import * as React from 'react'
import { cn } from '~/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/ui/tooltip'
import { formatRelativeTime } from '../../utils/formatRelativeTime'

/** Fixed status palette — never themed. */
const COLOR = {
  ok: '#0ca30c',
  due: '#fab219',
  stale: '#d03b3b',
  never: '#898781',
} as const

// Geometry. The 90-day axis runs X0 → X1; the dashed tail and the freshness
// circle live to the right of it, in "the future".
const W = 70
const H = 18
const BASE = 13
const X0 = 2
const X1 = 50
const DOT_X = 64
const WINDOW_MS = 90 * 24 * 60 * 60 * 1000

/** Where a check lands on the axis, clamped so anything older pins to the left. */
function axisX(at: number, now: number): number {
  const age = Math.min(Math.max(now - at, 0), WINDOW_MS)
  return X0 + (X1 - X0) * (1 - age / WINDOW_MS)
}

function FreshnessDot({ state }: { state: SourcePulseData['state'] }) {
  const filled = state === 'due' || state === 'stale'
  return (
    <>
      {state === 'stale' && (
        <circle
          cx={DOT_X}
          cy={BASE}
          r={5.4}
          stroke={COLOR.stale}
          strokeWidth={1}
          opacity={0.55}
        />
      )}
      <circle
        cx={DOT_X}
        cy={BASE}
        r={3.2}
        fill={filled ? COLOR[state] : 'none'}
        stroke={filled ? 'none' : COLOR[state]}
        strokeWidth={1.6}
        strokeDasharray={state === 'never' ? '2 1.6' : undefined}
      />
    </>
  )
}

function Track({ pulse, now }: { pulse: SourcePulseData; now: number }) {
  const ticks = pulse.checks.flatMap((check) => {
    const at = Date.parse(check.date)
    if (Number.isNaN(at)) return []
    return [{ x: axisX(at, now), top: check.changed ? 2 : 9.5 }]
  })
  return (
    <g>
      <line
        x1={X0}
        y1={BASE}
        x2={X1}
        y2={BASE}
        stroke="currentColor"
        strokeWidth={1}
        opacity={0.25}
      />
      {/* Every halo first, then every tick. Two checks hours apart land on the
          same pixel, and a 2px surface gap is what keeps them countable — but
          drawing halo-then-tick per check lets a newer halo erase an older tick.
          The gap has to be painted in the colour of whatever surface the mark is
          sitting on, which differs between the row and the inverted tooltip. */}
      {ticks.map((t, i) => (
        <line
          key={`halo-${i}`}
          x1={t.x}
          y1={BASE}
          x2={t.x}
          y2={t.top}
          strokeWidth={3.8}
          stroke="var(--pulse-surface)"
        />
      ))}
      {ticks.map((t, i) => (
        <line
          key={`tick-${i}`}
          x1={t.x}
          y1={BASE}
          x2={t.x}
          y2={t.top}
          strokeWidth={1.8}
          strokeLinecap="round"
          stroke="currentColor"
          opacity={t.top === 2 ? 0.9 : 0.4}
        />
      ))}
      <line
        x1={X1 + 3}
        y1={BASE}
        x2={DOT_X - 6}
        y2={BASE}
        stroke="currentColor"
        strokeWidth={1}
        strokeDasharray="1.5 2"
        opacity={0.25}
      />
    </g>
  )
}

/** "every 6d" / "every 4h" — the cadence as a reader would say it. */
function formatInterval(hours: number | null): string | null {
  if (hours == null) return null
  if (hours < 24) return `every ${Math.max(1, Math.round(hours))}h`
  return `every ${Math.round(hours / 24)}d`
}

const GLYPH_BOX = 'inline-flex w-3 shrink-0 justify-center'

/** The tooltip's legend rows: glyph, label, value. */
function Row({
  glyph,
  label,
  value,
  sub,
}: {
  glyph: React.ReactNode
  label: string
  value: string
  sub?: string
}) {
  return (
    <>
      <span className={GLYPH_BOX} aria-hidden="true">
        {glyph}
      </span>
      <span className="opacity-70">{label}</span>
      <span>
        {value}
        {sub && <span className="opacity-70"> {sub}</span>}
      </span>
    </>
  )
}

function Legend({ pulse, now }: { pulse: SourcePulseData; now: number }) {
  const changes = pulse.checks.filter((c) => c.changed).length
  const interval = formatInterval(pulse.intervalHours)

  const change = pulse.lastContentChangeAt
    ? `${pulse.contentChangeIsLowerBound ? 'over ' : ''}${formatRelativeTime(
        pulse.lastContentChangeAt,
        now,
      )}`
    : 'unknown'

  // "Next check" while it is still ahead; once it has passed, the honest label is
  // that it was DUE then — the reading may already be behind the source.
  const overdue = pulse.state === 'due' || pulse.state === 'stale'
  const dueLabel = overdue ? 'Was due' : 'Next check'
  const dueValue =
    pulse.state === 'never'
      ? 'first check pending'
      : pulse.dueAt
        ? formatRelativeTime(pulse.dueAt, now, true)
        : 'not scheduled'

  return (
    <div className="grid grid-cols-[auto_auto_1fr] items-baseline gap-x-2 gap-y-1">
      <Row
        glyph={
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path
              d="M1 8.5h2L4.5 3 6 8.5h3"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        }
        label="Cadence"
        value={interval ?? 'not scheduled'}
        sub={pulse.cadence ? `(${pulse.cadence})` : undefined}
      />
      <Row
        glyph={
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <line
              x1="5.5"
              y1="10"
              x2="5.5"
              y2="1"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        }
        label="Last change"
        value={change}
        sub={
          pulse.checks.length
            ? `· ${changes} of last ${pulse.checks.length} checks`
            : undefined
        }
      />
      <Row
        glyph={
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <line
              x1="5.5"
              y1="10"
              x2="5.5"
              y2="6.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              opacity="0.55"
            />
          </svg>
        }
        label="Last check"
        value={
          pulse.lastCheckedAt
            ? formatRelativeTime(pulse.lastCheckedAt, now)
            : 'never'
        }
      />
      <Row
        glyph={
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <circle
              cx="5.5"
              cy="7"
              r="3"
              stroke={COLOR[pulse.state]}
              strokeWidth="1.5"
              fill={overdue ? COLOR[pulse.state] : 'none'}
            />
          </svg>
        }
        label={dueLabel}
        value={dueValue}
        sub={pulse.state === 'stale' ? '· may be out of date' : undefined}
      />
    </div>
  )
}

/** The same sentence the legend says, for screen readers and the a11y tree. */
function readout(pulse: SourcePulseData, now: number): string {
  const parts = [
    pulse.cadence ? `checked ${pulse.cadence}` : 'no check schedule',
    pulse.lastContentChangeAt
      ? `last changed ${pulse.contentChangeIsLowerBound ? 'over ' : ''}${formatRelativeTime(pulse.lastContentChangeAt, now)}`
      : 'last change unknown',
    pulse.lastCheckedAt
      ? `last checked ${formatRelativeTime(pulse.lastCheckedAt, now)}`
      : 'never checked',
  ]
  if (pulse.state === 'due') parts.push('a re-check is overdue')
  if (pulse.state === 'stale') parts.push('overdue enough that it may be stale')
  return `Source freshness: ${parts.join(', ')}.`
}

export function SourcePulse({
  pulse,
  className,
}: {
  pulse: SourcePulseData
  className?: string
}) {
  // One timestamp for the whole render, so the mark and its legend cannot
  // disagree about "now" by a few milliseconds.
  // Reading the clock during render is deliberate. Making it pure would change when
  // the readout refreshes — today it re-reads on any parent re-render — and that is a
  // behaviour question, not a lint fix, so it is left as a suppression on purpose.
  // eslint-disable-next-line @eslint-react/purity
  const now = Date.now()

  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={readout(pulse, now)}
        className={cn(
          'group text-muted-foreground shrink-0 cursor-default rounded-sm [--pulse-surface:var(--card)] focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none',
          className,
        )}
      >
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          fill="none"
          aria-hidden="true"
        >
          <g className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <Track pulse={pulse} now={now} />
          </g>
          <FreshnessDot state={pulse.state} />
        </svg>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-none px-3 py-2 [--pulse-surface:var(--foreground)]"
      >
        <svg
          width={W * 2}
          height={H * 2}
          viewBox={`0 0 ${W} ${H}`}
          fill="none"
          aria-hidden="true"
          className="mb-1"
        >
          <Track pulse={pulse} now={now} />
          <FreshnessDot state={pulse.state} />
        </svg>
        <div className="mb-1.5 flex justify-between text-[10px] opacity-60">
          <span>90 days ago</span>
          <span>now</span>
        </div>
        <Legend pulse={pulse} now={now} />
      </TooltipContent>
    </Tooltip>
  )
}
