import type { AcAppIndexed } from '../common/app/appTypes'
import type {
  AcAppPageIndexed,
  AcAppUiIndexed,
} from '../common/app/ui/appUiTypes'
import type {
  AcBackendCredentialInput,
  AcBackendUiDefaultsInput,
} from './common'
import type { AcBackendDataSourceInput } from './dataSources'

export interface AcBackendVersionsRequestParams {
  envNames: string[]
  appNames: string[]
}

export interface AcBackendVersionsReturn {
  envIds: string[]
  appIds: string[]
}

export interface AcBackendPageInput extends AcAppPageIndexed {
  slug: string
  title?: string
  url: string
  credentialsRefs?: string[]
}

export interface AcBackendAppUIBaseInput {
  credentials?: AcBackendCredentialInput[]
  defaults?: AcBackendUiDefaultsInput
}

export interface AcBackendAppUIInput
  extends AcBackendAppUIBaseInput, AcAppUiIndexed {
  pages: AcBackendPageInput[]
}

export interface AcBackendTagsDescriptionDataIndexed {
  descriptions: AcBackendTagDescriptionDataIndexed[]
}

export interface AcBackendTagDescriptionDataIndexed {
  tagKey: string
  displayName?: string
  fixedTagValues?: AcBackendTagFixedTagValue[]
}

export interface AcBackendTagFixedTagValue {
  tagValue: string
  displayName: string
}

export interface AcBackendAppInput extends AcAppIndexed {
  ui?: AcBackendAppUIInput
  dataSources?: AcBackendDataSourceInput[]
}

export interface AcContextIndexed {
  slug: string
  displayName: string
  /**
   * The value is shared across envs (By default: false)
   */
  isSharedAcrossEnvs?: boolean
  defaultFixedValues?: string[]
}
export type AcBackendAppDto = AcAppIndexed

export interface AcAppsMeta {
  defaultIcon?: string
  tags: AcBackendTagsDescriptionDataIndexed
}
