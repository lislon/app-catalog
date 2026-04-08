import type { AppVersionInfo } from '../common/appCatalogTypes.js'

export interface AppCatalogCompanySpecificBackend {
  /**
   * Optional method to provide version information for both backend and frontend
   * Can be async to support fetching version info from external sources (e.g., GitLab API)
   * @returns Version info object with optional backend and frontend details, or undefined
   */
  getVersionInfo?: () =>
    | Promise<AppVersionInfo | undefined>
    | AppVersionInfo
    | undefined
}
