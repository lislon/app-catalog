import type { Prisma } from '../generated/prisma/client'
import type { ObjectKeys, ScalarKeys } from './tableSyncPrismaAdapter'

interface CommonSyncTableInfo<TPrismaModelName extends Prisma.ModelName> {
  prismaModelName: TPrismaModelName
  id?: ScalarKeys<TPrismaModelName>
  uniqColumns: ScalarKeys<TPrismaModelName>[]
  relationColumns?: ObjectKeys<TPrismaModelName>[]
}

type TableSyncMagazineType = Partial<{
  [key in Prisma.ModelName]: CommonSyncTableInfo<key>
}>

export const TABLE_SYNC_MAGAZINE = {
  DbPerson: {
    id: 'slug',
    prismaModelName: 'DbPerson',
    uniqColumns: ['slug'],
  },
  DbGroup: {
    id: 'slug',
    prismaModelName: 'DbGroup',
    uniqColumns: ['slug'],
  },
  DbGroupMembership: {
    prismaModelName: 'DbGroupMembership',
    uniqColumns: ['groupSlug', 'personSlug'],
  },
  DbResource: {
    prismaModelName: 'DbResource',
    uniqColumns: ['slug'],
  },
  DbAppTagDefinition: {
    prismaModelName: 'DbAppTagDefinition',
    uniqColumns: ['prefix'],
  },
  DbApprovalMethod: {
    id: 'slug',
    prismaModelName: 'DbApprovalMethod',
    uniqColumns: ['slug'],
  },
  Source: {
    id: 'slug',
    prismaModelName: 'Source',
    uniqColumns: ['slug'],
  },
  SourceReference: {
    prismaModelName: 'SourceReference',
    uniqColumns: ['resourceId', 'url'],
  },
} as const satisfies TableSyncMagazineType

export type TableSyncMagazine = typeof TABLE_SYNC_MAGAZINE
export type TableSyncMagazineModelNameKey = keyof TableSyncMagazine
