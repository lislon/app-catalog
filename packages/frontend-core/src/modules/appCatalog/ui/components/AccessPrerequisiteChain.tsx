import type { Resource } from '@igstack/app-catalog-backend-core'
import { ArrowRight, KeyRound } from 'lucide-react'
import { useAppCatalogContext } from '../../context/AppCatalogContext'
import { getAccessPrerequisiteChain } from '../../utils/resolveHelpers'

/**
 * Two-step (prerequisite) access banner (#38 item D). When the viewed resource
 * is a child whose ancestor(s) carry an access policy, the domain model says
 * the user must obtain the parent's access FIRST. That chain is invisible
 * otherwise, so surface it explicitly as ordered steps:
 *
 *   Step 1 — get access to <parent> (e.g. AWS Console via Support Portal)
 *   Step 2 — get access to THIS resource (contact its owner / access contacts)
 *
 * Renders nothing for root resources or children with no access-bearing parent.
 * `onOpenParent` lets the user jump to the parent's full access instructions.
 */
export function AccessPrerequisiteChain({
  resource,
  onOpenParent,
}: {
  resource: Resource
  onOpenParent?: (parent: Resource) => void
}) {
  const { resources } = useAppCatalogContext()
  const chain = getAccessPrerequisiteChain(resources, resource)
  if (chain.length === 0) return null

  // Steps = each prerequisite ancestor (root→nearest), then this resource last.
  const steps = [...chain, resource]

  return (
    <div
      className="mt-6 rounded-lg border-[1.5px] border-primary/40 bg-primary/[0.03] p-4"
      role="note"
      aria-label="Access requires prerequisite steps"
    >
      <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <KeyRound className="size-4 text-primary" />
        Two-step access
      </h3>
      <p className="mb-3 text-xs text-muted-foreground">
        This resource is nested — you need access to its parent first, then to
        the resource itself.
      </p>
      <ol className="space-y-2">
        {steps.map((r, i) => {
          const isLast = i === steps.length - 1
          return (
            <li key={r.slug} className="flex items-start gap-2.5 text-sm">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="text-muted-foreground">Get access to </span>
                {isLast ? (
                  <span className="font-semibold">this resource</span>
                ) : onOpenParent ? (
                  <button
                    type="button"
                    onClick={() => onOpenParent(r)}
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                  >
                    {r.displayName}
                    <ArrowRight className="size-3" />
                  </button>
                ) : (
                  <span className="font-semibold">{r.displayName}</span>
                )}
                {!isLast && (
                  <span className="text-muted-foreground">
                    {' '}
                    (see its access instructions)
                  </span>
                )}
                {isLast && (
                  <span className="text-muted-foreground">
                    {' '}
                    — details below.
                  </span>
                )}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
