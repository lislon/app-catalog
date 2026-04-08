import type { AcMetaDictionary } from '../common/sharedTypes'

export interface AcBackendEnvironmentInput {
  slug: string
  displayName?: string
  description?: string
  meta?: AcMetaDictionary
}

export interface AcBackendDeploymentInput {
  envId: string
  appId: string
  displayVersion: string
  meta?: AcMetaDictionary
}

export interface AcBackendDeployableInput {
  slug: string
  meta?: {
    config: string
  }
}

/**
 * Latest - backend returned latest data.
 * Cached - backend in process of updating data, but returned cached data.
 */
export type AcBackendDataFreshness = 'latest' | 'cached'

export interface AcBackendDataVersion {
  version: string
  freshness: AcBackendDataFreshness
}

export interface AcBackendDeployment {
  appName: string
  deployableServiceName: string
  envName: string
  version: AcBackendDataVersion
}
