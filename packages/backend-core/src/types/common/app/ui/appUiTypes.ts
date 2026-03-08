import type { Tag } from '../../sharedTypes'

export interface AcAppPageIndexed {
  slug: string
  displayName: string
  url: string
  tags?: Array<Tag>
}

export interface AcAppUiIndexed {
  pages: Array<AcAppPageIndexed>
}
