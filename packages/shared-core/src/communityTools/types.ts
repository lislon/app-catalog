export interface PersonRef {
  /** Null for an owner outside the person directory, known by name only. */
  slug: string | null
  name: string
}

export interface CommunityTag {
  kind: 'app' | 'topic'
  value: string
}

export type Lifecycle =
  | { state: 'active' }
  | { state: 'not-working'; days: number }
  | {
      state: 'archived'
      by: 'auto' | 'person'
      reason: string | null
      /** ISO time it was archived. */
      at: string
      /** Who archived it; null when it was archived automatically. */
      byName: string | null
    }

export interface CommunityTool {
  slug: string
  name: string
  url: string
  host: string
  summary: string
  descriptionMd: string
  owners: PersonRef[]
  addedBy: { userId: string; name: string }
  createdAt: string
  tags: CommunityTag[]
  views30d: number
  viewsAll: number
  reviewed: boolean
  lifecycle: Lifecycle
  screenshotId: string | null
  faviconId: string | null
  capturedAt: string | null
  /** No screenshot yet, and the first visit is still to come: worth waiting for. */
  capturePending: boolean
  canEdit: boolean
}

/** The longest tag value: a topic is a word or two, an app tag an app's slug. */
export const TAG_VALUE_MAX = 32

export type FeedWindow = 'month' | 'all' | 'newest'

export type MatchField =
  | 'name'
  | 'summary'
  | 'description'
  | 'owner'
  | 'address'
  | 'tag'
