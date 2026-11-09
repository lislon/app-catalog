import { useQuery } from '@tanstack/react-query'
import { useTRPC } from '~/api/infra/trpc'

/** The deployment's display settings for the MCP tab: categories, intents, wording. */
export function useMcpCatalogConfig() {
  const trpc = useTRPC()
  return useQuery(trpc.mcpCatalog.config.queryOptions()).data
}
