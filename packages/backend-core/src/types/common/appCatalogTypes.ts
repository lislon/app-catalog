/**
 * App Catalog Types - Universal Software Access Request Catalog
 *
 * These types define a standardized catalog of software applications and their
 * access methods. The typing system is designed to be universal across companies,
 * abstracting away specific tools (Jira, Slack, etc.) into generic categories.
 */

import type { AppAccessRequest, ApprovalMethod } from './approvalMethodTypes'
import type { Group, Person } from './personGroupTypes'

// ============================================================================
// TIER VARIANT
// ============================================================================

/**
 * A tier variant of a resource (e.g., prod/dev environments).
 * Each tier can have its own URL and access process.
 */
export interface TierVariant {
  tierSlug: string
  displayName?: string
  description?: string
  appUrl?: string
  accessRequest?: AppAccessRequest
}

// ============================================================================
// QUICK JUMP
// ============================================================================

/**
 * A deep link into a resource that needs one identifier from the user
 * ("open case 3117050260"). The user types the id once per identity and every
 * jump for that identity becomes clickable.
 *
 * The url carries at most two placeholders and nothing else — there is no
 * template engine:
 *   - `{{baseHost}}` — the resource's own `appUrl`, trailing slash trimmed.
 *     A jump using it is dropped when the resource has no `appUrl`.
 *   - `{{value}}` — the typed identifier, url-encoded exactly once.
 * A jump on a different host than the resource just spells the host out.
 */
export interface QuickJump {
  /**
   * Human label of the identifier this jump needs, e.g. "Case Id". Jumps are
   * grouped by it: it is the column heading, the input placeholder, and the key
   * the browser remembers typed values under, so spell it identically across
   * apps (company config should keep a shared constant rather than literals).
   */
  identity: string
  /** Shown on the button, with the typed value appended: "View case 3117050260". */
  title: string
  url: string
}

// ============================================================================
// APP CATALOG TYPES
// ============================================================================

/** One recorded re-read of a source, and whether it found the content changed. */
export interface SourceCheck {
  /** ISO-8601 timestamp of the check. */
  date: string
  changed: boolean
}

/**
 * Raw per-source scheduling facts, as the autoupdate loop records them. Supplied
 * by the sync and stored verbatim; {@link SourcePulse} is what gets derived from
 * it for display.
 */
export interface SourceSchedule {
  /** When the source was last re-read — a schedule tick, not a change. */
  lastCheckedAt?: string | null
  /** Not due for another read before this (includes jitter). */
  nextCheckAfter?: string | null
  /** When the content last actually changed, when the loop recorded it absolutely. */
  lastContentChangeAt?: string | null
  /** The source's own adaptive interval, in hours. */
  checkIntervalHours?: number | null
  /** Recent checks, newest first. Capped by the producer (5 entries today). */
  changeHistory?: SourceCheck[] | null
}

/** How often a source has been changing, bucketed from its own check interval. */
export type SourceCadence =
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'

/** Whether a source's reading is still current. Per-source twin of `isStale`. */
export type SourcePulseState = 'ok' | 'due' | 'stale' | 'never'

/**
 * Display-ready cadence + freshness for one source. Derived from
 * {@link SourceSchedule} — see `modules/appCatalog/sourcePulse.ts`.
 */
export interface SourcePulse {
  state: SourcePulseState
  /** Null until the loop has scheduled this source at all. */
  intervalHours: number | null
  cadence: SourceCadence | null
  lastCheckedAt: string | null
  /** When the next read is (or was) due. */
  dueAt: string | null
  lastContentChangeAt: string | null
  /**
   * True when `lastContentChangeAt` is only a LOWER bound: no absolute stamp and
   * no observed change left inside the capped history window, so all we honestly
   * know is "older than this". Render it as "over N ago", never as a exact date.
   */
  contentChangeIsLowerBound: boolean
  /** The checks behind the mark, newest first. */
  checks: SourceCheck[]
}

/**
 * Source reference with metadata (used in API responses)
 * Note: parseDate is string (ISO-8601) when serialized from API, null when not yet parsed
 *
 * Doubles as the shape the SYNC accepts, which is why only `url` is required: the
 * sync derives `sourceSlug` from the URL and owns `parseDate`, so a producer
 * supplies the URL plus `schedule` and nothing else. Both are always populated on
 * the way back out.
 */
export interface SourceReference {
  sourceSlug?: string
  url: string
  parseDate?: string | null
  /** Supplied by the sync from the autoupdate registry; not sent to clients. */
  schedule?: SourceSchedule
  /** Derived from {@link schedule} on read — what the UI's pulse mark draws. */
  pulse?: SourcePulse
}

/**
 * Backend-computed freshness of an entry's source data. See
 * `modules/appCatalog/freshness.ts` for how it is derived.
 */
export interface Freshness {
  /** ISO-8601 timestamp the app's sources were last verified, or null if never. */
  lastCheckedAt: string | null
  /**
   * ISO-8601 timestamp the source content last actually CHANGED — what the UI
   * shows as "Updated". Distinct from `lastCheckedAt`: a source can be re-read
   * repeatedly without changing. Null for entries scanned before this was
   * tracked, in which case the frontend falls back to `lastCheckedAt`.
   */
  lastContentChangeAt: string | null
  /** True when the entry is overdue for a re-check by more than the grace period. */
  isStale: boolean
}

/**
 * Resource entry in the catalog (application or sub-resource).
 * Unified model: applications have no parentSlug; sub-resources have parentSlug.
 */
export interface Resource {
  id: string
  slug: string
  /** Discriminator: "application" for top-level apps, "sub-resource" for children, etc. */
  type?: string
  displayName: string
  abbreviation?: string // Optional short abbreviation (e.g. K8s, ECR, LV)
  nicknames?: string[] // Alternative names / AKA
  description?: string
  teams?: string[]
  accessRequest?: AppAccessRequest
  notes?: string
  tags?: string[]
  appUrl?: string
  links?: { url: string; title?: string }[]
  iconName?: string // Optional icon identifier for display
  screenshotIds?: string[]
  sources?: string[] | SourceReference[] // String URLs from config OR enriched objects from database
  deprecated?: {
    /** Type of deprecation: 'deprecated' (fully deprecated) or 'discouraged' (use alternatives). Defaults to 'deprecated'. */
    type?: 'deprecated' | 'discouraged'
    /** Slug of the replacement app (optional) */
    replacementSlug?: string
    /** Deprecation message */
    comment: string
  }
  /** Agent-facing prompt guiding how to maintain this app's data */
  aiPrompt?: string
  /** AI-owned scratchpad: strategies, gotchas, scripts, retros accumulated per app */
  aiMemory?: string
  /** URL health issues detected by automated scanning */
  urlIssues?: string[]
  /** Optional tier variants (e.g., prod/dev) with per-tier URLs and access */
  tiers?: TierVariant[]
  /** Deep links that take one typed identifier — see {@link QuickJump}. */
  quickJumps?: QuickJump[]

  // --- Fields merged from former SubResource ---
  /** Slug of parent resource (undefined for top-level applications) */
  parentSlug?: string
  /** Tier slug (e.g. "prod", "dev") — for sub-resources */
  tier?: string
  /** Alternative identifiers */
  aliases?: string[]
  /** Person slug of the owner */
  ownerPersonSlug?: string
  /** Slugs of who decides on an access request — each a Person or a Group */
  approverSlugs?: string[]
  /** Free-text access comments */
  accessComments?: string
  /** Arbitrary extra data */
  extra?: Record<string, unknown>
  /**
   * Backend-computed freshness of this entry's source data (OUTPUT — set by the
   * serializer on the served Resource). The frontend renders it directly (no
   * calculation): show `lastCheckedAt`, and a muted "may be out of date" note
   * when `isStale`. Omitted when the app has never been scanned.
   */
  freshness?: Freshness
  /**
   * Raw freshness timestamps (INPUT — supplied by the company sync from its scan
   * metadata, persisted to the DB). Not served to the frontend; the serializer
   * derives `freshness` from these. ISO-8601 strings.
   */
  lastCheckedAt?: string | null
  nextCheckAfter?: string | null
  lastContentChangeAt?: string | null
  /**
   * ISO-8601 date when this app was first added to the catalog (INPUT — set in
   * static config from git history). Used by the sync to seed DB `createdAt` on
   * first insert and after DB rebuilds. Never changes once set.
   */
  catalogAddedAt?: string
  /** ISO-8601 timestamp of when this entry was first created in the catalog DB. */
  createdAt?: string
}

// Derived catalog data returned by backend
export interface AppCategory {
  id: string
  name: string
}

export interface GroupingTagDefinition {
  prefix: string
  displayName: string
  description: string
  values: GroupingTagValue[]
}

type DistributiveOmit<T, TKey extends keyof any> = T extends any
  ? Omit<T, TKey>
  : never

export type AppApprovalMethod = DistributiveOmit<
  ApprovalMethod,
  'createdAt' | 'updatedAt'
>

export interface GroupingTagValue {
  value: string
  displayName: string
  description: string
}

export interface VersionInfo {
  displayName: string
  url?: string
  /** Short git SHA of the source this artifact was built from (e.g. 'a1b2c3d'). */
  sha?: string
  /** Link to the commit for `sha` (e.g. a GitHub commit URL). */
  shaUrl?: string
}

export interface AppVersionInfo {
  backend?: VersionInfo
  frontend?: VersionInfo
  coreVersion?: VersionInfo
}

export interface AppCatalogData {
  resources: Resource[]
  tagsDefinitions: GroupingTagDefinition[]
  approvalMethods: AppApprovalMethod[]
  persons: Person[]
  groups: Group[]
  versions?: AppVersionInfo
}
