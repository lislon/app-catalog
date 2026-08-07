import type { PwaAutoUpdateOptions } from '~/modules/pwa/types'

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
  /** PWA auto-update configuration (idle timeout, check interval, debug) */
  pwaAutoUpdate?: PwaAutoUpdateOptions
  /**
   * Optional attribution shown as a subtle footer line on the home view.
   * Kept generic here (no hard-coded names/links) so the OSS core stays
   * vendor-neutral; the consuming app supplies its own author + repo links.
   */
  attribution?: {
    /** e.g. "Made by <name>" — rendered verbatim. */
    madeBy?: string
    /** Labeled links; `kind` lets the UI hint open-source vs proprietary. */
    links?: {
      label: string
      url: string
      kind?: 'oss' | 'proprietary'
    }[]
  }
}
