import type { AppCatalogCompanySpecificBackend } from '../types'
import type { User } from 'better-auth/types'

export interface EhTrpcContext {
  companySpecificBackend: AppCatalogCompanySpecificBackend
  user: User | null
  adminGroups: Array<string>
}

export interface EhTrpcContextOptions {
  companySpecificBackend: AppCatalogCompanySpecificBackend
  user?: User | null
  adminGroups: Array<string>
}

export function createEhTrpcContext({
  companySpecificBackend,
  user = null,
  adminGroups,
}: EhTrpcContextOptions): EhTrpcContext {
  return {
    companySpecificBackend,
    user,
    adminGroups,
  }
}
