import type { QueryClient } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { ApiQueryMagazineAppCatalog } from '~/modules/appCatalog/api/ApiQueryMagazineAppCatalog'

/**
 * Whether the catalog lists any MCP server, read with the route context's
 * client for the route above the layout's providers. The layout's own query,
 * so it is one request. Undefined until the catalog is in, and after a failed
 * load, which the layout reports itself.
 */
export function useHasMcpServers(
  queryClient: QueryClient,
): boolean | undefined {
  const { data } = useQuery(
    ApiQueryMagazineAppCatalog.getAppCatalog(),
    queryClient,
  )
  // The type says required, but a returning visitor's IndexedDB copy from an
  // older build has no `mcpServers` until the network answers.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return data && (data.mcpServers?.length ?? 0) > 0
}
