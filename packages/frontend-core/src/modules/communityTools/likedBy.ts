import type { CommunityTool } from '@igstack/app-catalog-shared-core'

/** How many likers the tooltip names; the rest are a count. */
const NAMED = 8

/**
 * "Liked by you, A, B and 3 others": you first, then up to eight colleagues,
 * newest first, then how many more.
 */
export function likedByText(
  tool: Pick<CommunityTool, 'likes' | 'likedByMe' | 'likedBy'>,
): string {
  if (tool.likes === 0) return 'No likes yet'
  const names = [
    ...(tool.likedByMe ? ['you'] : []),
    ...tool.likedBy.slice(0, NAMED),
  ]
  const others = tool.likes - names.length
  if (others > 0) {
    return `Liked by ${names.join(', ')} and ${others} ${others === 1 ? 'other' : 'others'}`
  }
  const last = names.pop()
  return names.length > 0
    ? `Liked by ${names.join(', ')} and ${last}`
    : `Liked by ${last}`
}

/** The tool as it reads once I liked it, or took the like back. */
export function withLike(tool: CommunityTool, liked: boolean): CommunityTool {
  if (tool.likedByMe === liked) return tool
  return { ...tool, likedByMe: liked, likes: tool.likes + (liked ? 1 : -1) }
}
