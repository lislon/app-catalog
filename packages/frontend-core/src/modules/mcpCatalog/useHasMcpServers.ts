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
  return data && data.mcpServers.length > 0
}
