import type { AppCatalogCompanySpecificBackend } from '../types'
import type { Actor } from '../modules/visitor/visitorIdentity'
import type { User } from 'better-auth/types'

export interface AcTrpcContext {
  companySpecificBackend: AppCatalogCompanySpecificBackend
  user: User | null
  isAdmin: boolean
  /**
   * Who is acting on this request — the signed-in user when there is one, otherwise the
   * anonymous browser behind it. The catalog is browsable logged out and feedback is
   * attributed to this rather than to `user`. Null when the context was built without a
   * response to issue the cookie on.
   */
  actor: Actor | null
}

export interface AcTrpcContextOptions {
  companySpecificBackend: AppCatalogCompanySpecificBackend
  user?: User | null
  isAdmin?: boolean
  actor?: Actor | null
}

export function createAcTrpcContext({
  companySpecificBackend,
  user = null,
  isAdmin = false,
  actor = null,
}: AcTrpcContextOptions): AcTrpcContext {
  return { companySpecificBackend, user, isAdmin, actor }
}
