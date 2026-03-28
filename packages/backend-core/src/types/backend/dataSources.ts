import type { AcMetaDictionary } from '../common/sharedTypes'

export interface AcBackendDataSourceInputCommon {
  meta?: AcMetaDictionary
}

export interface AcBackendDataSourceInputDb {
  slug?: string
  type: 'db'
  url: string
  username: string
  password: string
}

export interface AcBackendDataSourceInputKafka {
  slug?: string
  type: 'kafka'
  topics: {
    consumer?: string[]
    producer?: string[]
  }
}

export type AcBackendDataSourceInput = AcBackendDataSourceInputCommon &
  (AcBackendDataSourceInputDb | AcBackendDataSourceInputKafka)
