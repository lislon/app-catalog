import { useMutation, useQueryClient } from '@tanstack/react-query'
import React from 'react'
import { useTRPC } from '~/api/infra/trpc'
import { cn } from '~/lib/utils'
import { Button } from '~/ui/button'

/** px: 20 line-height + 2×9 padding + 2×1 border. */
const ONE_LINE = 40
const MAX_HEIGHT = 200

/**
 * The card's one ask for more information, at the foot of every tab. A plain
 * one-line field at rest; Send appears once there is something to send, and the
 * field grows into a box as the text wraps. Sends in place — the reader stays on
 * the tab they were reading. Text only: images go through the full composer
 * under Notes & requests.
 */
export function KnowMoreInput({
  appSlug,
  appName,
}: {
  appSlug: string
  appName: string
}) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [text, setText] = React.useState('')
  const [sent, setSent] = React.useState(false)
  const [height, setHeight] = React.useState(ONE_LINE)
  const fieldRef = React.useRef<HTMLTextAreaElement>(null)
  // A hidden twin measures the height the text needs, so the real field can
  // animate to it. Setting `height: auto` on the real one snaps instead.
  const mirrorRef = React.useRef<HTMLTextAreaElement>(null)

  const add = useMutation(
    trpc.feedback.add.mutationOptions({
      onSuccess: () => {
        setText('')
        setSent(true)
        void queryClient.invalidateQueries({
          queryKey: trpc.feedback.list.queryKey({ resourceSlug: appSlug }),
        })
      },
    }),
  )

  const typing = text.trim() !== ''

  React.useEffect(() => {
    if (sent) {
      fieldRef.current?.blur()
    }
  }, [sent])

  React.useLayoutEffect(() => {
    const field = fieldRef.current
    const mirror = mirrorRef.current
    if (!field || !mirror) return
    mirror.style.width = `${field.offsetWidth}px`
    mirror.value = text || ' '
    // +2: scrollHeight excludes the border, the box height includes it.
    setHeight(Math.min(Math.max(mirror.scrollHeight + 2, ONE_LINE), MAX_HEIGHT))
  }, [text])

  const submit = () => {
    if (!typing || add.isPending) return
    add.mutate({ resourceSlug: appSlug, body: text.trim() })
  }

  const label = `Know something more about ${appName}?`

  return (
    <form
      className="know-more"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <div
        className={cn(
          'know-more-field',
          typing && 'is-typing',
          height > ONE_LINE && 'is-multi',
        )}
      >
        <textarea
          ref={fieldRef}
          rows={1}
          value={text}
          aria-label={label}
          placeholder={label}
          style={{
            height,
            overflowY: height >= MAX_HEIGHT ? 'auto' : 'hidden',
          }}
          onChange={(e) => {
            setText(e.target.value)
            setSent(false)
          }}
          onKeyDown={(e) => {
            if (
              e.key === 'Enter' &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault()
              submit()
            }
            // Esc clears a draft, and only a draft: with nothing typed it must
            // reach the card's layer so the card still closes.
            if (e.key === 'Escape' && text !== '') {
              e.preventDefault()
              e.stopPropagation()
              setText('')
            }
          }}
        />
        <Button
          type="submit"
          size="sm"
          className="know-more-send"
          tabIndex={typing ? 0 : -1}
          aria-hidden={!typing}
          disabled={add.isPending}
        >
          Send
        </Button>
        <textarea
          ref={mirrorRef}
          rows={1}
          readOnly
          tabIndex={-1}
          aria-hidden
          className="know-more-mirror"
        />
      </div>
      <p className="know-more-hint">
        Enter to send · Shift+Enter for a new line · Esc to cancel
      </p>
      {add.isError && (
        <p role="alert" className="know-more-error">
          Could not send — your text is still here. Try again.
        </p>
      )}
      <p role="status" className={cn('know-more-sent', sent && 'is-on')}>
        {sent ? 'Thanks — sent. It shows under Notes & requests.' : ''}
      </p>
    </form>
  )
}
