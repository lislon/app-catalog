import type { AcMetaDictionary, Tag } from '../sharedTypes'
import type { AcAppUiIndexed } from './ui/appUiTypes'

export interface AcAppIndexed {
  slug: string
  displayName: string
  abbr?: string
  aliases?: Array<string>
  ui?: AcAppUiIndexed
  tags?: Array<Tag>
  iconName?: string
  meta?: AcMetaDictionary
}
