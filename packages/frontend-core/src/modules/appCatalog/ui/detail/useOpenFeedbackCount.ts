import { useQuery } from '@tanstack/react-query'
import { useTRPC } from '~/api/infra/trpc'

/**
 * How many notes on this entry still wait for a maintainer.
 *
 * The same query the notes list runs, so the tab count and the list share one
 * cache entry and one request. Zero while loading or on error: a count that is
 * not known yet is not shown.
 */
export function useOpenFeedbackCount(appSlug: string): number {
  const trpc = useTRPC()
  const { data } = useQuery(
    trpc.feedback.list.queryOptions({ resourceSlug: appSlug }),
  )
  return data?.openCount ?? 0
}
