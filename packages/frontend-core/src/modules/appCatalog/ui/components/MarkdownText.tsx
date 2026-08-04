import { Link, useRouterState } from '@tanstack/react-router'
import type React from 'react'
import ReactMarkdown from 'react-markdown'
import { useAppCatalogContext } from '../../context/AppCatalogContext'

/** Match a relative internal catalog link: `/app/<slug>` (slug only, no extra path). */
const INTERNAL_APP_LINK = /^\/app\/([^/?#]+)$/

/**
 * Renders a markdown link.
 *
 * Internal cross-references — a relative `/app/<slug>` pointing at another
 * catalog entry — navigate WITHIN the app via the TanStack router (same tab,
 * no full reload), so authors can cross-link entries with plain markdown
 * `[Name](/app/<slug>)` (#25). The slug is validated against the loaded
 * resources (canonical slug or a known alias); an unknown slug renders as
 * plain text rather than a dead link.
 *
 * Everything else (external http/https links) opens in a new tab with
 * `noopener noreferrer`, unchanged. Shared so all catalog text fields render
 * links identically.
 */
export const MarkdownLink = ({
  href,
  children,
}: {
  href?: string
  children?: React.ReactNode
}) => {
  const { resources } = useAppCatalogContext()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const internalMatch = href?.match(INTERNAL_APP_LINK)
  if (internalMatch) {
    const slug = decodeURIComponent(internalMatch[1] ?? '')
    const exists = resources.some(
      (r) => r.slug === slug || r.aliases?.includes(slug),
    )
    // Unknown slug → render plain text, never a dead internal link.
    if (!exists) {
      return <>{children}</>
    }
    const isCurrent = pathname === `/app/${slug}`
    return (
      <Link
        to="/app/$slug"
        params={{ slug }}
        search={(prev) => prev}
        aria-current={isCurrent ? 'page' : undefined}
        className="text-primary hover:underline"
      >
        {children}
      </Link>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline"
    >
      {children}
    </a>
  )
}

/**
 * Renders user-facing catalog text (descriptions, comments, prompts) as
 * markdown so links become clickable. Links use {@link MarkdownLink}.
 */
export function MarkdownText({
  children,
  className,
}: {
  children: string
  className?: string
}) {
  return (
    <span className={className}>
      <ReactMarkdown components={{ a: MarkdownLink }}>{children}</ReactMarkdown>
    </span>
  )
}
