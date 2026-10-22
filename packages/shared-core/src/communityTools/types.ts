export interface PersonRef {
  slug: string
  name: string
}

export interface CommunityTag {
  kind: 'app' | 'topic'
  value: string
}

export type Lifecycle =
  | { state: 'active' }
  | { state: 'not-working'; days: number }
  | { state: 'archived'; by: 'auto' | 'person'; reason: string | null }

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
  canEdit: boolean
}

/** A tool in the visitor's Recently opened, with when they last opened its card. */
export interface RecentTool extends CommunityTool {
  /** ISO time of the visitor's latest view. */
  openedAt: string
}

/** How many tools Recently opened holds. */
export const RECENT_TOOLS_LIMIT = 5

export type FeedWindow = 'month' | 'all' | 'newest'

export type MatchField =
  | 'name'
  | 'summary'
  | 'description'
  | 'owner'
  | 'address'
  | 'tag'
