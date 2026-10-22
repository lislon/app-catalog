import type { CommunityTool } from '@igstack/app-catalog-shared-core'
import { ThumbsUp } from 'lucide-react'
import { cn } from '~/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/ui/tooltip'
import { likedByText } from '../likedBy'

/**
 * A thumb and the count, filled in the brand colour once I liked it; hover or
 * focus says who liked it.
 */
export function LikeButton({
  tool,
  onToggle,
}: {
  tool: Pick<CommunityTool, 'name' | 'likes' | 'likedByMe' | 'likedBy'>
  onToggle: () => void
}) {
  const { name, likes, likedByMe } = tool
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          data-testid="like-button"
          aria-pressed={likedByMe}
          aria-label={`${likedByMe ? 'Unlike' : 'Like'} ${name}, ${likes} ${likes === 1 ? 'like' : 'likes'}`}
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
          className={cn(
            'relative z-10 inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-lg px-1.5 transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring',
            likedByMe ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          <ThumbsUp
            aria-hidden="true"
            className={cn(
              'size-[15px]',
              likedByMe && 'fill-primary/85 stroke-foreground',
            )}
          />
          <span data-testid="like-count">{likes}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent
        data-testid="liked-by"
        sideOffset={8}
        className="max-w-[300px] rounded-[10px] px-2.5 py-[7px] text-[12.5px] leading-[1.4] font-semibold"
      >
        {likedByText(tool)}
      </TooltipContent>
    </Tooltip>
  )
}
