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
  envNames: Array<string>
  appNames: Array<string>
}

export interface AcBackendVersionsReturn {
  envIds: Array<string>
  appIds: Array<string>
}

export interface AcBackendPageInput extends AcAppPageIndexed {
  slug: string
  title?: string
  url: string
  credentialsRefs?: Array<string>
}

export interface AcBackendAppUIBaseInput {
  credentials?: Array<AcBackendCredentialInput>
  defaults?: AcBackendUiDefaultsInput
}

export interface AcBackendAppUIInput
  extends AcBackendAppUIBaseInput, AcAppUiIndexed {
  pages: Array<AcBackendPageInput>
}

export interface AcBackendTagsDescriptionDataIndexed {
  descriptions: Array<AcBackendTagDescriptionDataIndexed>
}

export interface AcBackendTagDescriptionDataIndexed {
  tagKey: string
  displayName?: string
  fixedTagValues?: Array<AcBackendTagFixedTagValue>
}

export interface AcBackendTagFixedTagValue {
  tagValue: string
  displayName: string
}

export interface AcBackendAppInput extends AcAppIndexed {
  ui?: AcBackendAppUIInput
  dataSources?: Array<AcBackendDataSourceInput>
}

export interface AcContextIndexed {
  slug: string
  displayName: string
  /**
   * The value is shared across envs (By default: false)
   */
  isSharedAcrossEnvs?: boolean
  defaultFixedValues?: Array<string>
}
export type AcBackendAppDto = AcAppIndexed

export interface AcAppsMeta {
  defaultIcon?: string
  tags: AcBackendTagsDescriptionDataIndexed
}
