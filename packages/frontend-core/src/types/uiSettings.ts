/**
 * UI settings passed from the app entry point.
 */
export interface UiSettings {
  /** Filter pane configuration */
  filterPane?: {
    /** Tag prefixes that should be filterable (e.g., ["category"]) */
    filterByTagPrefixes?: string[]
  }
}
