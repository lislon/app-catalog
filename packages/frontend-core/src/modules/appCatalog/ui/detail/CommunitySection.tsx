import type { Claim } from '@igstack/app-catalog-backend-core'
import React from 'react'
import { CommentsFeed } from './CommentsFeed'
import { CommentsHelp } from './CommentsHelp'
import { CommunityInput } from './CommunityInput'
import type { CommunityInputHandle } from './CommunityInput'

export type CommunitySectionHandle = CommunityInputHandle

const NO_CLAIMS: Claim[] = []

/**
 * The top of Behind this card: one input that takes words and screenshots,
 * then "Comments" with its help, then everything already said about the entry
 * as one feed.
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
  const headingId = React.useId()
  return (
    <section className="behind-group">
      <CommunityInput ref={ref} appSlug={appSlug} appName={appName} />
      <div className="comments-head">
        <h2 id={headingId} className="behind-group__title">
          Comments
        </h2>
        <CommentsHelp appSlug={appSlug} appName={appName} />
      </div>
      <CommentsFeed appSlug={appSlug} claims={claims} labelledBy={headingId} />
    </section>
  )
}
