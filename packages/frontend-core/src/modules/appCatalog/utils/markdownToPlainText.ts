/**
 * Reduce a short markdown string to its visible plain text.
 *
 * Descriptions may contain markdown — notably cross-reference links like
 * `[Team Chat](/app/team-chat)` (#25). The detail panel renders
 * those as interactive links via {@link MarkdownText}, but in compact / clamped
 * surfaces (grid list preview, table row, filter combobox, sub-resources) an
 * interactive link would break `line-clamp` and can't be reliably highlighted
 * for search. There we show the *text* only — so `[Name](/app/slug)` shows
 * "Name", never the raw bracket/paren syntax.
 *
 * This is deliberately a small, allocation-cheap regex pass (not a full
 * markdown parser): it covers the inline constructs that actually appear in
 * catalog descriptions — links, images, emphasis, and inline code.
 */
export function markdownToPlainText(input: string): string {
  if (!input) return ''

  return (
    input
      // Images: ![alt](url) → alt (must run before links)
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      // Links: [text](url) → text
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      // Bold / italic markers: **x**, __x__, *x*, _x_ → x
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      // Inline code: `x` → x
      .replace(/`([^`]*)`/g, '$1')
  )
}
