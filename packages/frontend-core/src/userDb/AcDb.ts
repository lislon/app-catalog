import Dexie from 'dexie'
import type {
  AppCatalogData,
  TRPCRouter,
} from '@igstack/app-catalog-backend-core'
import type { inferRouterOutputs } from '@trpc/server'
import type { Table } from 'dexie'

export type CommunityToolsConfig =
  inferRouterOutputs<TRPCRouter>['communityTools']['config']

export interface AppClickHistoryItem {
  id?: number
  appSlug: string
  timestamp: number
}

export class AcDb extends Dexie {
  appCatalog!: Table<AppCatalogData>
  appClickHistory!: Table<AppClickHistoryItem>
  communityToolsConfig!: Table<CommunityToolsConfig>

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
