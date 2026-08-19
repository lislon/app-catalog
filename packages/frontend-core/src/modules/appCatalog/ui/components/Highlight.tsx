import { highlightText } from '../../utils/searchApps'

/**
 * Highlights all case-insensitive occurrences of `query` in `text`.
 * Renders plain text when query is empty or has no match.
 */
export function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const segments = highlightText(text, query)
  return (
    <>
      {segments.map((seg, i) =>
        seg.highlight ? (
          <mark
            key={i}
            className="bg-primary/15 text-primary rounded-[2px] px-[1px] font-semibold not-italic"
          >
            {seg.text}
          </mark>
        ) : (
          seg.text
        ),
      )}
    </>
  )
}
