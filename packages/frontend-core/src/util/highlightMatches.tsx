import React from 'react'

// Escape regex special characters
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function highlightMatches(text: string, query: string): React.ReactNode {
  if (!query) return text

  const safeQuery = escapeRegex(query)
  const regex = new RegExp(`(${safeQuery})`, 'gi')
  const parts = text.split(regex)

  return (
    <>
      {parts.map((part, idx) => {
        const key = `${part}-${text.indexOf(part, idx)}`
        return idx % 2 === 1 ? (
          <span key={key} className="bg-highlight">
            {part}
          </span>
        ) : (
          <React.Fragment key={key}>{part}</React.Fragment>
        )
      })}
    </>
  )
}

/** Like `highlightMatches`, for several search words at once, in any order. */
export function highlightTokens(
  text: string,
  tokens: string[],
): React.ReactNode {
  const words = tokens.filter(Boolean)
  if (words.length === 0) return text

  // Longest first, so "runbook" wins over its own prefix "run".
  const alternation = [...words]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex)
    .join('|')
  const parts = text.split(new RegExp(`(${alternation})`, 'gi'))

  let offset = 0
  return (
    <>
      {parts.map((part, idx) => {
        // An empty part shares its offset with the match after it; parity splits them.
        const key = `${offset}-${idx % 2}`
        offset += part.length
        return idx % 2 === 1 ? (
          <span key={key} className="rounded-[3px] bg-highlight">
            {part}
          </span>
        ) : (
          <React.Fragment key={key}>{part}</React.Fragment>
        )
      })}
    </>
  )
}
