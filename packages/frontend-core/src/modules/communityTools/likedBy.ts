import type { CommunityTool } from '@igstack/app-catalog-shared-core'

/** "Liked by A, B and 3 others": two names at most, the rest a count. */
export function likedByText(names: string[], total: number): string {
  if (total === 0) return 'No likes yet'
  const shown = names.slice(0, 2)
  const others = total - shown.length
  if (others <= 0) return `Liked by ${shown.join(' and ')}`
  return `Liked by ${shown.join(', ')} and ${others} ${others === 1 ? 'other' : 'others'}`
}

/** The tool as it reads once `name` has liked it, or taken the like back. */
export function withLike(
  tool: CommunityTool,
  liked: boolean,
  name: string,
): CommunityTool {
  if (tool.likedByMe === liked) return tool
  const i = tool.likedBy.indexOf(name)
  return {
    ...tool,
    likedByMe: liked,
    likes: tool.likes + (liked ? 1 : -1),
    likedBy: liked
      ? [name, ...tool.likedBy].slice(0, 8)
      : tool.likedBy.filter((_, j) => j !== i),
  }
}
