import { ThumbsUp } from 'lucide-react'
import { cn } from '~/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/ui/tooltip'
import { likedByText } from '../likedBy'

/** A thumb and the count; filled in the brand colour once I liked it. */
export function LikeButton({
  name,
  likes,
  likedByMe,
  likedBy,
  onToggle,
}: {
  name: string
  likes: number
  likedByMe: boolean
  likedBy: string[]
  onToggle: () => void
}) {
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
            likedByMe ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          <ThumbsUp
            aria-hidden="true"
            className={cn('size-[15px]', likedByMe && 'fill-primary/25')}
          />
          <span data-testid="like-count">{likes}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent data-testid="liked-by">
        {likedByText(likedBy, likes)}
      </TooltipContent>
    </Tooltip>
  )
}
