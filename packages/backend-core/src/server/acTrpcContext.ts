import type { AppCatalogCompanySpecificBackend } from '../types'
import type { Visitor } from '../modules/comments/visitorIdentity'
import type { User } from 'better-auth/types'

export interface AcTrpcContext {
  companySpecificBackend: AppCatalogCompanySpecificBackend
  user: User | null
  isAdmin: boolean
  /**
   * The anonymous browser behind this request, independent of `user` — the catalog
   * is browsable logged out, and comments are attributed to this instead. Null when
   * the context was built without a response to issue the cookie on.
   */
  visitor: Visitor | null
}

export interface AcTrpcContextOptions {
  companySpecificBackend: AppCatalogCompanySpecificBackend
  user?: User | null
  isAdmin?: boolean
  visitor?: Visitor | null
}

export function createAcTrpcContext({
  companySpecificBackend,
  user = null,
  isAdmin = false,
  visitor = null,
}: AcTrpcContextOptions): AcTrpcContext {
  return { companySpecificBackend, user, isAdmin, visitor }
}
