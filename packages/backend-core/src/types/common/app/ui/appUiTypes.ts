import type { Tag } from '../../sharedTypes'

export interface AcAppPageIndexed {
  slug: string
  displayName: string
  url: string
  tags?: Tag[]
}

export interface AcAppUiIndexed {
  pages: AcAppPageIndexed[]
}
