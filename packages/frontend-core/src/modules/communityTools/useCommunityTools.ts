import type { CommunityTool } from '@igstack/app-catalog-shared-core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTRPC } from '~/api/infra/trpc'
import { useAppCatalogContext } from '~/modules/appCatalog/context/AppCatalogContext'
import { useAuth } from '~/modules/auth'

/**
 * Everything the community page reads, and the pin writes. Pins and recents
 * belong to the signed-in user, so they are not asked for until there is one.
 */
export function useCommunityTools() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const { resources } = useAppCatalogContext()

  const list = useQuery(trpc.communityTools.list.queryOptions())
  const pins = useQuery(
    trpc.communityTools.pins.queryOptions(undefined, {
      enabled: isAuthenticated,
    }),
  )
  const recent = useQuery(
    trpc.communityTools.recent.queryOptions(undefined, {
      enabled: isAuthenticated,
    }),
  )

  /** Display names of official apps by slug, for app tags. */
  const appNames = useMemo(
    () => Object.fromEntries(resources.map((r) => [r.slug, r.displayName])),
    [resources],
  )

  const pinsKey = trpc.communityTools.pins.queryKey()
  const refreshPins = () => queryClient.invalidateQueries({ queryKey: pinsKey })

  const pin = useMutation(
    trpc.communityTools.pin.mutationOptions({ onSettled: refreshPins }),
  )
  const unpin = useMutation(
    trpc.communityTools.unpin.mutationOptions({ onSettled: refreshPins }),
  )
  const reorder = useMutation(
    trpc.communityTools.reorderPins.mutationOptions({
      onMutate: ({ slugs }) => {
        // The tile moves at once; the server catches up behind it.
        queryClient.setQueryData<CommunityTool[]>(pinsKey, (old) =>
          old ? slugs.flatMap((s) => old.find((t) => t.slug === s) ?? []) : old,
        )
      },
      onSettled: refreshPins,
    }),
  )

  return {
    list,
    pins,
    recent,
    appNames,
    isAuthenticated,
    isAuthLoading,
    pin,
    unpin,
    reorder,
  }
}
