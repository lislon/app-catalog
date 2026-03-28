import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTRPCClient } from '~/api/infra/trpc'
import { queryKey } from '~/api/unsorted/appCatalogFetcher'

export interface UpdateAppVariables {
  id: string
  data: {
    displayName?: string
    alias?: string | null
    slug?: string
    appUrl?: string
    description?: string
    sources?: string[]
  }
}

export function useUpdateApp() {
  const client = useTRPCClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateAppVariables) =>
      client.appCatalog.updateApp.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })
}
