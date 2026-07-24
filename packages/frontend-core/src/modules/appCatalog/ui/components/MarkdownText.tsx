import type React from 'react'
import ReactMarkdown from 'react-markdown'

/**
 * Renders a markdown link with security attributes (opens in a new tab,
 * no referrer/opener leakage). Shared so all catalog text fields render
 * links identically.
 */
export const MarkdownLink = ({
  href,
  children,
}: {
  href?: string
  children?: React.ReactNode
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="text-primary hover:underline"
  >
    {children}
  </a>
)

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
