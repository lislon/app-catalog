import type { Claim } from '@igstack/app-catalog-backend-core'
import React from 'react'
import { CommentsFeed } from './CommentsFeed'
import { CommentsHelp } from './CommentsHelp'
import { CommunityInput } from './CommunityInput'
import type { CommentTarget } from './communityDraft'
import type { CommunityInputHandle } from './CommunityInput'

export type CommunitySectionHandle = CommunityInputHandle

const NO_CLAIMS: Claim[] = []

/**
 * The top of Behind this card: one input that takes words and screenshots,
 * then "Comments" with its help, then everything already said about the entry
 * as one feed.
 */
export function CommunitySection({
  target,
  appName,
  claims = NO_CLAIMS,
  ref,
}: {
  target: CommentTarget
  /** The entry's or the tool's name, for the input's label. */
  appName: string
  claims?: Claim[]
  ref?: React.Ref<CommunitySectionHandle>
}) {
  const headingId = React.useId()
  return (
    <section className="behind-group">
      <CommunityInput ref={ref} target={target} appName={appName} />
      <div className="comments-head">
        <h2 id={headingId} className="behind-group__title">
          Comments
        </h2>
        <CommentsHelp
          appSlug={'resourceSlug' in target ? target.resourceSlug : undefined}
          appName={appName}
        />
      </div>
      <CommentsFeed target={target} claims={claims} labelledBy={headingId} />
    </section>
  )
}
