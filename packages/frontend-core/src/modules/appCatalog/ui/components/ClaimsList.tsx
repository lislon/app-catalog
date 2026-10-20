import type { Claim } from '@igstack/app-catalog-backend-core'

/** `feedback:<id>` is only meaningful to a maintainer; a reader sees where it came from. */
function originLabel(origin: string | undefined): string | null {
  if (!origin) return null
  return origin.startsWith('feedback:') ? 'from visitor feedback' : origin
}

function ClaimRow({ claim }: { claim: Claim }) {
  const origin = originLabel(claim.origin)
  return (
    <li
      className={claim.status === 'archived' ? 'claim claim-archived' : 'claim'}
    >
      <span className="claim-dot" aria-hidden />
      <div>
        <div className="claim-text">{claim.text}</div>
        <div className="claim-meta">
          {claim.addedAt}
          {origin && ` · ${origin}`}
        </div>
        {claim.status === 'archived' && claim.archiveReason && (
          <div className="claim-reason">
            Archived{claim.archivedAt ? ` ${claim.archivedAt}` : ''} —{' '}
            {claim.archiveReason}
          </div>
        )}
      </div>
    </li>
  )
}

/** Active claims, then the archived ones folded away with the reason each stopped applying. */
export function ClaimsList({ claims }: { claims: Claim[] }) {
  const active = claims.filter((c) => c.status !== 'archived')
  const archived = claims.filter((c) => c.status === 'archived')
  return (
    <>
      {active.length > 0 && (
        <ul className="claims">
          {active.map((c) => (
            <ClaimRow key={c.text} claim={c} />
          ))}
        </ul>
      )}
      {archived.length > 0 && (
        <details className="claims-archived">
          <summary>Archived ({archived.length})</summary>
          <ul className="claims">
            {archived.map((c) => (
              <ClaimRow key={c.text} claim={c} />
            ))}
          </ul>
        </details>
      )}
    </>
  )
}
