import type { Claim } from '@igstack/app-catalog-backend-core'
import { useQuery } from '@tanstack/react-query'
import { useTRPC } from '~/api/infra/trpc'
import { countPending } from './composeComments'

const NO_CLAIMS: Claim[] = []

/**
 * How many entries in the Comments feed say Pending: open notes, notes whose
 * claim is still in review, and review claims with no note of their own.
 *
 * The same query the feed runs, so the tab count and the feed share one cache
 * entry and one request, and are composed by the same rules. Zero while
 * loading or on error: until the notes arrive, a claim cannot be matched to
 * its note, and a count that is not known yet is not shown.
 */
export function usePendingCount(
  appSlug: string,
  claims: Claim[] = NO_CLAIMS,
): number {
  const trpc = useTRPC()
  const { data } = useQuery(
    trpc.feedback.list.queryOptions({ resourceSlug: appSlug }),
  )
  return data ? countPending(data.items, claims) : 0
}
