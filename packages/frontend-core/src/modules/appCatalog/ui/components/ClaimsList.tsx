import type { Claim } from '@igstack/app-catalog-backend-core'

/** `feedback:<id>` is only meaningful to a maintainer; a reader sees where it came from. */
function originLabel(origin: string | undefined): string | null {
  if (!origin) return null
  return origin.startsWith('feedback:') ? 'from visitor feedback' : origin
}

function ClaimRow({ claim }: { claim: Claim }) {
  const origin = originLabel(claim.origin)
  const isReview = claim.status === 'review'
  const isArchived = claim.status === 'archived'
  return (
    <li
      className={
        isArchived
          ? 'claim claim-archived'
          : isReview
            ? 'claim claim-review'
            : 'claim'
      }
    >
      <div className="claim-row">
        <div className="claim-text">
          {claim.text}
          {isReview && <span className="claim-review-tag">In review</span>}
        </div>
        <div className="claim-meta">
          {origin && `${origin} · `}
          {claim.addedAt}
        </div>
      </div>
      {isArchived && claim.archiveReason && (
        <div className="claim-reason">
          Archived{claim.archivedAt ? ` ${claim.archivedAt}` : ''} —{' '}
          {claim.archiveReason}
        </div>
      )}
    </li>
  )
}

/** Active claims first, then review claims, then archived ones folded away. */
export function ClaimsList({ claims }: { claims: Claim[] }) {
  const active = claims.filter((c) => c.status === 'active')
  const review = claims.filter((c) => c.status === 'review')
  const archived = claims.filter((c) => c.status === 'archived')
  return (
    <>
      {(active.length > 0 || review.length > 0) && (
        <ul className="claims">
          {active.map((c, i) => (
            <ClaimRow key={`${i}-${c.text}`} claim={c} />
          ))}
          {review.map((c, i) => (
            <ClaimRow key={`${i}-${c.text}`} claim={c} />
          ))}
        </ul>
      )}
      {archived.length > 0 && (
        <details className="claims-archived">
          <summary>Archived ({archived.length})</summary>
          <ul className="claims">
            {archived.map((c, i) => (
              <ClaimRow key={`${i}-${c.text}`} claim={c} />
            ))}
          </ul>
        </details>
      )}
    </>
  )
}
