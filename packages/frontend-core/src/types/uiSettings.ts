/**
 * UI settings passed from the app entry point.
 */
export interface UiSettings {
  /** Filter pane configuration */
  filterPane?: {
    /** Tag prefixes that should be filterable (e.g., ["category"]) */
    filterByTagPrefixes?: string[]
  }
  /** Frontend build identifier baked at build time (e.g., pipeline ID via VITE env var) */
  frontendBuildId?: string
}
