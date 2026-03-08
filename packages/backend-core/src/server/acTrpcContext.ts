import type { AppCatalogCompanySpecificBackend } from '../types'
import type { User } from 'better-auth/types'

export interface AcTrpcContext {
  companySpecificBackend: AppCatalogCompanySpecificBackend
  user: User | null
  isAdmin: boolean
}

export interface AcTrpcContextOptions {
  companySpecificBackend: AppCatalogCompanySpecificBackend
  user?: User | null
  isAdmin?: boolean
}

export function createAcTrpcContext({
  companySpecificBackend,
  user = null,
  isAdmin = false,
}: AcTrpcContextOptions): AcTrpcContext {
  return { companySpecificBackend, user, isAdmin }
}
