/**
 * Marks every search term in `text`. Terms match independently, so a query of
 * two words lights up both wherever they occur.
 *
 * Plain marker on ink, no weight change: on a card that already carries a title,
 * a muted line and a link, the match is the one accent.
 */
export function Marked({ text, query }: { text: string; query: string }) {
  const terms = query.trim().split(/\s+/).filter(Boolean)
  if (!terms.length) return <>{text}</>
  const pattern = new RegExp(
    `(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'gi',
  )
  return (
    <>
      {text.split(pattern).map((part, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            className="rounded-[3px] bg-highlight px-0.5 text-foreground"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  )
}
