/**
 * Render-side helper for the search UI. The ranking engine itself lives in
 * `@igstack/app-catalog-shared-core` so the UI and the MCP server rank
 * identically and cannot drift.
 */

/**
 * Highlight matching text in a string
 * @param text - Text to highlight
 * @param query - Search query
 * @returns Array of text segments with highlight flags
 */
export function highlightText(
  text: string,
  query: string,
): { text: string; highlight: boolean }[] {
  if (!query.trim()) {
    return [{ text, highlight: false }]
  }

  const normalizedQuery = query.trim().toLowerCase()
  const lowerText = text.toLowerCase()
  const index = lowerText.indexOf(normalizedQuery)

  if (index === -1) {
    return [{ text, highlight: false }]
  }

  const segments: { text: string; highlight: boolean }[] = []

  // Text before match
  if (index > 0) {
    segments.push({ text: text.slice(0, index), highlight: false })
  }

  // Matched text
  segments.push({
    text: text.slice(index, index + normalizedQuery.length),
    highlight: true,
  })

  // Text after match
  if (index + normalizedQuery.length < text.length) {
    segments.push({
      text: text.slice(index + normalizedQuery.length),
      highlight: false,
    })
  }

  return segments
}
