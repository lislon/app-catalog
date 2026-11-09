import { useQuery } from '@tanstack/react-query'
import { useTRPC } from '~/api/infra/trpc'

const DEFAULT_SENSITIVE_DATA_LABEL = 'Sensitive data'

/**
 * The deployment's display settings for the MCP tab: categories, intents,
 * wording. Undefined until loaded.
 */
export function useMcpCatalogConfig() {
  const trpc = useTRPC()
  return useQuery(trpc.mcpCatalog.config.queryOptions()).data
}

/** The tag for servers that touch sensitive data, as the deployment words it. */
export function useSensitiveDataLabel(): string {
  return (
    useMcpCatalogConfig()?.sensitiveDataLabel ?? DEFAULT_SENSITIVE_DATA_LABEL
  )
}
