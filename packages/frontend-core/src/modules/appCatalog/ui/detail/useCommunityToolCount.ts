import { useQuery } from '@tanstack/react-query'
import { useTRPC } from '~/api/infra/trpc'

/**
 * How many live community tools are tagged with this app. One query for the
 * whole catalog, so switching cards asks nothing new. Zero while loading, and
 * when the deployment has community tools turned off.
 */
export function useCommunityToolCount(appSlug: string): number {
  const trpc = useTRPC()
  const { data: config } = useQuery(trpc.communityTools.config.queryOptions())
  const { data: counts } = useQuery(
    trpc.communityTools.countByApp.queryOptions(undefined, {
      enabled: config?.enabled === true,
    }),
  )
  return counts?.[appSlug] ?? 0
}
