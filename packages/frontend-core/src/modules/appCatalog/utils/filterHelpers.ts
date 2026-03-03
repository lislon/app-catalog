/**
 * Decode filters from URL parameter format.
 *
 * Converts "category:communication,department:sales" → { category: "communication", department: "sales" }
 *
 * @param param - URL parameter string in format "key:value,key:value"
 * @returns Object with filter key-value pairs
 */
export function decodeFiltersParam(param: string): Record<string, string> {
  if (!param || param.trim() === '') {
    return {}
  }

  const filters: Record<string, string> = {}

  // Split by comma, then by first colon
  param.split(',').forEach((pair) => {
    const colonIndex = pair.indexOf(':')
    if (colonIndex === -1) return // Skip malformed pairs

    const key = pair.slice(0, colonIndex).trim()
    const value = pair.slice(colonIndex + 1).trim()

    if (key && value) {
      filters[key] = value
    }
  })

  return filters
}

/**
 * Encode filters to URL parameter format.
 *
 * Converts { category: "communication", department: "sales" } → "category:communication,department:sales"
 *
 * @param filters - Object with filter key-value pairs
 * @returns URL parameter string, or undefined if no filters
 */
export function encodeFiltersParam(
  filters: Record<string, string>,
): string | undefined {
  const pairs = Object.entries(filters)
    .filter(([key, value]) => key && value) // Skip empty keys/values
    .map(([key, value]) => `${key}:${value}`)

  return pairs.length > 0 ? pairs.join(',') : undefined
}
