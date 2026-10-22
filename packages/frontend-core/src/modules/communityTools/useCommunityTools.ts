import type { CommunityTool } from '@igstack/app-catalog-shared-core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTRPC } from '~/api/infra/trpc'
import { useAppCatalogContext } from '~/modules/appCatalog/context/AppCatalogContext'
import { useAuth } from '~/modules/auth'
import { withLike } from './likedBy'

/**
 * Everything the community page reads, and the pin writes. Pins
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

  /** Display names of official apps by slug, for app tags. */
  const appNames = useMemo(
    () => Object.fromEntries(resources.map((r) => [r.slug, r.displayName])),
    [resources],
  )

  const pinsKey = trpc.communityTools.pins.queryKey()
  const refreshPins = () => queryClient.invalidateQueries({ queryKey: pinsKey })

  // The star and the shelf change at once; a failed save puts them back.
  const optimisticPins = (
    change: (old: CommunityTool[], slug: string) => CommunityTool[],
  ) => ({
    onMutate: async ({ slug }: { slug: string }) => {
      await queryClient.cancelQueries({ queryKey: pinsKey })
      const previous = queryClient.getQueryData<CommunityTool[]>(pinsKey)
      queryClient.setQueryData<CommunityTool[]>(pinsKey, (old) =>
        old ? change(old, slug) : old,
      )
      return { previous }
    },
    onError: (
      _error: unknown,
      _input: { slug: string },
      context: { previous?: CommunityTool[] } | undefined,
    ) => {
      queryClient.setQueryData(pinsKey, context?.previous)
    },
    // Not awaited: the pin is saved once the server answers; the refetch
    // behind it only confirms what the star already shows.
    onSettled: () => {
      void refreshPins()
    },
  })
  const pin = useMutation(
    trpc.communityTools.pin.mutationOptions(
      optimisticPins((old, slug) => {
        const tool = list.data?.find((t) => t.slug === slug)
        return tool && !old.some((t) => t.slug === slug) ? [...old, tool] : old
      }),
    ),
  )
  const unpin = useMutation(
    trpc.communityTools.unpin.mutationOptions(
      optimisticPins((old, slug) => old.filter((t) => t.slug !== slug)),
    ),
  )
  /** The tool whose pin is being saved, if any. */
  const pinBusySlug = pin.isPending
    ? pin.variables.slug
    : unpin.isPending
      ? unpin.variables.slug
      : undefined
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

  // The thumb and its count change at once, in the feed and on the shelf; a
  // failed save puts both back.
  const listKey = trpc.communityTools.list.queryKey()
  const optimisticLike = (liked: boolean) => ({
    onMutate: async ({ slug }: { slug: string }) => {
      const keys = [listKey, pinsKey]
      await Promise.all(
        keys.map((queryKey) => queryClient.cancelQueries({ queryKey })),
      )
      const previous = keys.map(
        (key) => [key, queryClient.getQueryData<CommunityTool[]>(key)] as const,
      )
      for (const key of keys) {
        queryClient.setQueryData<CommunityTool[]>(key, (old) =>
          old?.map((t) => (t.slug === slug ? withLike(t, liked) : t)),
        )
      }
      return { previous }
    },
    onError: (
      _error: unknown,
      _input: { slug: string },
      context:
        | { previous: (readonly [unknown, CommunityTool[] | undefined])[] }
        | undefined,
    ) => {
      for (const [key, data] of context?.previous ?? []) {
        queryClient.setQueryData(key as typeof listKey, data)
      }
    },
  })
  const like = useMutation(
    trpc.communityTools.like.mutationOptions(optimisticLike(true)),
  )
  const unlike = useMutation(
    trpc.communityTools.unlike.mutationOptions(optimisticLike(false)),
  )

  return {
    list,
    pins,
    appNames,
    isAuthenticated,
    isAuthLoading,
    pin,
    unpin,
    pinBusySlug,
    reorder,
    like,
    unlike,
  }
}
