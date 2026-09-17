import type { ComponentType } from 'react'
import type { PwaAutoUpdateOptions } from '~/modules/pwa/types'

/** Icon component for an area header. Lucide icon components satisfy this. */
export type AreaIcon = ComponentType<{
  size?: number
  strokeWidth?: number
  className?: string
}>

/**
 * Presentation of the area sections on the home view. The taxonomy is
 * deployment-specific, so the core ships none of it: labels come from the
 * catalog's own `category` tag definition and everything below is optional.
 */
export interface AreasSettings {
  /**
   * Icon per `category:<value>`; the key `DAY_TO_DAY_AREA_KEY` targets the
   * merged first group. Areas without an icon render title-only.
   */
  icons?: Record<string, AreaIcon>
  /**
   * Category values that fold into the day-to-day group instead of getting an
   * area of their own (e.g. perks, office services).
   */
  dayToDayCategories?: string[]
  /** Title of the merged first group. Defaults to "Day-to-day tools". */
  dayToDayLabel?: string
}

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
  /** Area sections on the home view: icons and the day-to-day fold. */
  areas?: AreasSettings
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
