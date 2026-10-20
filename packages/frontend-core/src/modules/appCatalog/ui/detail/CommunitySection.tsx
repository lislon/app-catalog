import type { Claim } from '@igstack/app-catalog-backend-core'
import type React from 'react'
import { CommunityInput } from './CommunityInput'
import type { CommunityInputHandle } from './CommunityInput'
import { CommunityLists } from './CommunityLists'

export type CommunitySectionHandle = CommunityInputHandle

const NO_CLAIMS: Claim[] = []

/**
 * Behind this card's "From the community": one input that takes words and
 * screenshots, then everything already said about the entry, grouped by where
 * it stands. Split across `CommunityInput` and `CommunityLists` for size only.
 */
export function CommunitySection({
  appSlug,
  appName,
  claims = NO_CLAIMS,
  ref,
}: {
  appSlug: string
  appName: string
  claims?: Claim[]
  ref?: React.Ref<CommunitySectionHandle>
}) {
  return (
    <>
      <CommunityInput ref={ref} appSlug={appSlug} appName={appName} />
      <CommunityLists appSlug={appSlug} claims={claims} />
    </>
  )
}
