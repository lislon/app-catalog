import type { McpServer } from '@igstack/app-catalog-shared-core'
import type { ReactNode } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/ui/tooltip'
import { useAppCatalogContext } from '../appCatalog/context/AppCatalogContext'
import { useMcpCatalogConfig } from './useMcpCatalogConfig'

/**
 * The Triad: a server's icon is its safety answer. The top circle says what
 * your AI can do (eye reads, dark pencil writes), the bottom-left dot whether
 * it needs access to other apps (filled lock), the bottom-right whether it
 * touches sensitive data (red cross). A dotted empty circle means no. The red
 * and the muted dots are fixed, like a status colour; the ink follows the
 * theme, so a dark shape never disappears into a dark page.
 */
const MUTE = '#b9ab98'
/** Ink shapes: near-black on light, the page's foreground on dark. */
const INK_FILL = 'fill-[#2c2622] dark:fill-foreground'
const INK_STROKE = 'stroke-[#2c2622] dark:stroke-foreground'
/** A glyph drawn on an ink shape: white on light, the page's background on dark. */
const ON_INK =
  'stroke-white text-white dark:stroke-background dark:text-background'
/**
 * The read-only circle: soft fill on light. On dark it goes hollow, so filled
 * still means "can write" rather than both circles turning pale.
 */
const SOFT_FILL = 'fill-[#efe7da] dark:fill-transparent'
const ON_SOFT =
  'stroke-[#2c2622] text-[#2c2622] dark:stroke-foreground dark:text-foreground'

type TriadServer = Pick<
  McpServer,
  'access' | 'sensitiveData' | 'requiredAppSlugs'
>

const GLYPH: Record<'eye' | 'pencil' | 'lock' | 'cross', ReactNode> = {
  eye: (
    <>
      <path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  pencil: (
    <>
      <path d="M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z" />
      <path d="m15 5 4 4" />
    </>
  ),
  lock: (
    <>
      <rect width="18" height="11" x="3" y="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  cross: (
    <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" fill="currentColor" stroke="none" />
  ),
}

/** A 24-unit glyph, centred on (cx, cy) and scaled to `size`. */
function Glyph({
  name,
  cx,
  cy,
  size,
  className,
  strokeWidth,
}: {
  name: keyof typeof GLYPH
  cx: number
  cy: number
  size: number
  /** Sets the glyph's stroke and `currentColor`. */
  className: string
  strokeWidth: number
}) {
  return (
    <g
      transform={`translate(${cx - size / 2} ${cy - size / 2}) scale(${size / 24})`}
      fill="none"
      className={className}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {GLYPH[name]}
    </g>
  )
}

function Pip({
  cx,
  on,
  glyph,
  fillClass,
  glyphClass,
}: {
  cx: number
  on: boolean
  glyph: keyof typeof GLYPH
  fillClass: string
  glyphClass: string
}) {
  return on ? (
    <>
      <circle cx={cx} cy={34} r={8.8} className={fillClass} />
      <Glyph
        name={glyph}
        cx={cx}
        cy={34}
        size={10.5}
        className={glyphClass}
        strokeWidth={2.8}
      />
    </>
  ) : (
    <circle
      cx={cx}
      cy={34}
      r={7.6}
      fill="none"
      stroke={MUTE}
      strokeWidth={1.5}
      strokeDasharray="1.5 2.4"
    />
  )
}

/** The names of the apps a server needs an account in; an unknown slug shows as itself. */
export function useRequiredAppNames(server: TriadServer): string[] {
  const { resources } = useAppCatalogContext()
  return (server.requiredAppSlugs ?? []).map(
    (slug) => resources.find((r) => r.slug === slug)?.displayName ?? slug,
  )
}

/** The Triad's full answer in words, e.g. "Can write · Needs access: X · Sensitive data". */
export function useTriadLabel(server: TriadServer): string {
  const apps = useRequiredAppNames(server)
  const sensitiveLabel =
    useMcpCatalogConfig()?.sensitiveDataLabel ?? 'Sensitive data'
  return [
    server.access === 'write' ? 'Can write' : 'Read-only',
    apps.length > 0 ? `Needs access: ${apps.join(', ')}` : 'No extra access',
    server.sensitiveData ? sensitiveLabel : 'No sensitive data',
  ].join(' · ')
}

export function Triad({
  server,
  size,
  decorative = false,
}: {
  server: TriadServer
  size: number
  /** A legend sample: hidden from assistive tech, no tooltip, not focusable. */
  decorative?: boolean
}) {
  const label = useTriadLabel(server)
  const write = server.access === 'write'
  const svg = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      {...(decorative
        ? { 'aria-hidden': true }
        : { role: 'img', 'aria-label': label })}
    >
      <circle
        cx={22}
        cy={13.5}
        r={12}
        className={`${write ? INK_FILL : SOFT_FILL} ${INK_STROKE}`}
        strokeWidth={1.8}
      />
      <Glyph
        name={write ? 'pencil' : 'eye'}
        cx={22}
        cy={13.5}
        size={14}
        className={write ? ON_INK : ON_SOFT}
        strokeWidth={2.6}
      />
      <Pip
        cx={11}
        on={(server.requiredAppSlugs ?? []).length > 0}
        glyph="lock"
        fillClass={INK_FILL}
        glyphClass={ON_INK}
      />
      <Pip
        cx={33}
        on={!!server.sensitiveData}
        glyph="cross"
        fillClass="fill-[#d4343b]"
        glyphClass="stroke-white text-white"
      />
    </svg>
  )
  if (decorative) return <span className="inline-flex shrink-0">{svg}</span>
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="inline-flex shrink-0 rounded-md focus-visible:outline-2 focus-visible:outline-ring"
        >
          {svg}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-60">{label}</TooltipContent>
    </Tooltip>
  )
}
