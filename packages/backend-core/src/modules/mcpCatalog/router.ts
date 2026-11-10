import type { McpCatalogConfig } from '@igstack/app-catalog-shared-core'
import { publicProcedure, router } from '../../server/trpcSetup'

export type McpCatalogConfigResponse = Required<
  Pick<McpCatalogConfig, 'sensitiveDataLabel'>
> &
  McpCatalogConfig

/** Company display settings for the MCP tab; no table, served as configured. */
export function createMcpCatalogRouter(config?: McpCatalogConfig) {
  const response: McpCatalogConfigResponse = {
    ...config,
    sensitiveDataLabel: config?.sensitiveDataLabel ?? 'Sensitive data',
  }
  return router({
    config: publicProcedure.query(() => response),
  })
}
