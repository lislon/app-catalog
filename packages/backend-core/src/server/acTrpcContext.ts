import type { AppCatalogCompanySpecificBackend } from '../types'
import type { User } from 'better-auth/types'

export interface AcTrpcContext {
  companySpecificBackend: AppCatalogCompanySpecificBackend
  user: User | null
  adminGroups: Array<string>
}

export interface AcTrpcContextOptions {
  companySpecificBackend: AppCatalogCompanySpecificBackend
  user?: User | null
  adminGroups: Array<string>
}

export function createAcTrpcContext({
  companySpecificBackend,
  user = null,
  adminGroups,
}: AcTrpcContextOptions): AcTrpcContext {
  return {
    companySpecificBackend,
    user,
    adminGroups,
  }
}
