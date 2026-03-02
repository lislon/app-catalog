export interface AppCatalogCompanySpecificBackend {
  /**
   * Optional method to provide app version information (e.g., pipeline ID, build number)
   * @returns Version object with displayName and optional URL, or undefined if not available
   */
  getAppVersion?: () => { displayName: string; url?: string } | undefined
}
