import type { AppForCatalog } from '../common/appCatalogTypes'

export interface AppCatalogCompanySpecificBackend {
  getApps?: () => Promise<Array<AppForCatalog>>
}
