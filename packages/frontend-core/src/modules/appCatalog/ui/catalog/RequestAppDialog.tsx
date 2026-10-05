import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTRPC } from '~/api/infra/trpc'
import { Button } from '~/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/ui/dialog'
import { cn } from '~/lib/utils'

/**
 * Asking for something that is not in the catalog yet.
 *
 * The search box is where people discover the gap — they type a tool's name, get
 * nothing, and until now had nowhere to go. A zero-result search is the single most
 * informative moment in the catalog: someone has told us exactly what they expected to
 * find. Throwing that away and showing only "No results" wastes it.
 *
 * This is a catalog-level ask rather than feedback on an entry: `feedback.add` with a
 * `subject` and NO `resourceSlug`. The server already distinguishes the two that way,
 * and the tracker lists both.
 */

/** Same shape the input primitive uses, minus the fixed height. */
const FIELD_CLASSES =
  'placeholder:text-muted-foreground dark:bg-input/30 border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50'

const MAX_SUBJECT = 120

interface RequestAppDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** What they searched for. Pre-fills the name, because they just typed it. */
  initialSubject?: string
}

/**
 * Mounts nothing until it is opened, which is what keeps `useTRPC()` out of the
 * closed path. The catalog grid is rendered bare in several tests with no
 * TRPCProvider, and a hook cannot be called conditionally — so the gate has to be a
 * component boundary rather than an `if` inside one.
 */
export function RequestAppDialog(props: RequestAppDialogProps) {
  if (!props.open) return null
  return <RequestAppDialogBody {...props} />
}

function RequestAppDialogBody({
  open,
  onOpenChange,
  initialSubject = '',
}: RequestAppDialogProps) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [subject, setSubject] = useState(initialSubject)
  const [body, setBody] = useState('')
  const [sent, setSent] = useState(false)

  // Re-seed when opened for a different search. Keyed on the dialog opening rather
  // than on every keystroke, so it never overwrites something half-typed.
  useEffect(() => {
    if (open) {
      setSubject(initialSubject)
      setBody('')
      setSent(false)
    }
  }, [open, initialSubject])

  const add = useMutation(
    trpc.feedback.add.mutationOptions({
      onSuccess: () => {
        setSent(true)
        // The tracker counts this, so its badge has to notice.
        void queryClient.invalidateQueries({
          queryKey: trpc.feedback.mine.queryKey(),
        })
      },
    }),
  )

  const trimmed = subject.trim()
  const send = () => {
    if (!trimmed) return
    add.mutate({
      subject: trimmed.slice(0, MAX_SUBJECT),
      ...(body.trim() ? { body: body.trim() } : {}),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {sent ? 'Thanks — that is logged' : 'Ask for an app to be added'}
          </DialogTitle>
        </DialogHeader>

        {sent ? (
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">
              A maintainer will look at it. You can see what happened to it
              under your own requests.
            </p>
            <Button type="button" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="request-app-name" className="text-sm font-medium">
                What are you looking for?
              </label>
              <input
                id="request-app-name"
                autoFocus
                className={cn(FIELD_CLASSES)}
                placeholder="Name of the tool, or what it does"
                maxLength={MAX_SUBJECT}
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="request-app-detail"
                className="text-sm font-medium"
              >
                Anything that would help us find it{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </label>
              <textarea
                id="request-app-detail"
                rows={3}
                className={cn(FIELD_CLASSES)}
                placeholder="A link, the team that owns it, what you needed it for"
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                size="sm"
                disabled={!trimmed || add.isPending}
                onClick={send}
              >
                {add.isPending ? 'Sending…' : 'Send request'}
              </Button>
              <span className="text-muted-foreground text-xs">
                Sent under a nickname. No login needed.
              </span>
            </div>

            {add.error && (
              <p className="text-destructive text-xs">
                {add.error instanceof Error
                  ? add.error.message
                  : 'Something went wrong'}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
