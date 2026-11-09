import Dexie from 'dexie'
import type {
  AppCatalogData,
  TRPCRouter,
} from '@igstack/app-catalog-backend-core'
import type { InstallOptionId } from '@igstack/app-catalog-shared-core'
import type { inferRouterOutputs } from '@trpc/server'
import type { Table } from 'dexie'

export type CommunityToolsConfig =
  inferRouterOutputs<TRPCRouter>['communityTools']['config']

export interface AppClickHistoryItem {
  id?: number
  appSlug: string
  timestamp: number
}

/** The MCP tab's remembered choices, one row per key. */
export type McpPref =
  | { key: 'installWith'; value: InstallOptionId }
  | { key: 'installed'; value: string[] }

export class AcDb extends Dexie {
  appCatalog!: Table<AppCatalogData>
  appClickHistory!: Table<AppClickHistoryItem>
  communityToolsConfig!: Table<CommunityToolsConfig>
  mcpPrefs!: Table<McpPref, McpPref['key']>

  constructor() {
    super('app-catalog')
    this.version(1).stores({
      appCatalog: '',
    })
    this.version(2).stores({
      appCatalog: '',
      appClickHistory: '++id, appSlug, timestamp',
    })
    this.version(3).stores({
      appCatalog: '',
      appClickHistory: '++id, appSlug, timestamp',
      communityToolsConfig: '',
    })
    this.version(4).stores({
      appCatalog: '',
      appClickHistory: '++id, appSlug, timestamp',
      communityToolsConfig: '',
      mcpPrefs: 'key',
    })
  }

  /**
   * Resets the entire database by deleting and recreating it
   * This clears all data and resets version tracking to fix migration issues
   */
  async resetDatabase(): Promise<void> {
    const dbName = this.name
    this.close()
    await Dexie.delete(dbName)
    await this.open()
  }
}

export enum dbCacheDbKeys {
  AppCatalog = 'appCatalog',
  CommunityToolsConfig = 'communityToolsConfig',
}
