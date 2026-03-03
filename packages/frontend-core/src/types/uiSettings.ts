/**
 * UI settings passed from the app entry point (natera-specific configuration)
 */
export interface UiSettings {
  /** Filter pane configuration */
  filterPane?: {
    /** Tag prefixes that should be filterable (e.g., ["category"]) */
    filterByTagPrefixes?: Array<string>
  }
}
