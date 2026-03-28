import type { AcMetaDictionary, Tag } from '../sharedTypes'
import type { AcAppUiIndexed } from './ui/appUiTypes'

export interface AcAppIndexed {
  slug: string
  displayName: string
  abbr?: string
  aliases?: string[]
  ui?: AcAppUiIndexed
  tags?: Tag[]
  iconName?: string
  meta?: AcMetaDictionary
}
