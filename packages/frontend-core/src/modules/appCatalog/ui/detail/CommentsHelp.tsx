import React from 'react'
import { useDismissable } from '~/modules/dismiss/DismissStack'
import { ResourceDetailFeedbackNote, useSlotFilled } from '~/modules/extensions'

/**
 * The `?` beside "Comments": what the input takes, and what becomes of a note.
 * Folded away so the input stays one line; Esc and a click outside close it.
 * While closed it is not a dismiss layer, so Esc still reaches the card.
 */
export function CommentsHelp({
  appSlug,
  appName,
}: {
  appSlug: string
  appName: string
}) {
  const [open, setOpen] = React.useState(false)
  const buttonRef = React.useRef<HTMLButtonElement>(null)
  const popoverRef = React.useRef<HTMLDivElement>(null)
  const id = React.useId()
  const hasPluginNote = useSlotFilled('resourceDetailFeedbackNote')

  useDismissable(
    popoverRef,
    () => {
      setOpen(false)
      buttonRef.current?.focus()
    },
    { enabled: open },
  )

  React.useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (
        popoverRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      )
        return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="comments-help-button"
        aria-label="How comments work"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <circle
            cx="8"
            cy="8"
            r="6.75"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
          />
          <path
            d="M6.25 6.3a1.8 1.8 0 0 1 3.5.55c0 1.2-1.75 1.45-1.75 2.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
          <circle cx="8" cy="11.4" r="0.8" fill="currentColor" />
        </svg>
      </button>
      <div ref={popoverRef} id={id} className="comments-help" hidden={!open}>
        <p className="comments-help__title">How comments work</p>
        <ul>
          <li>
            Paste a link — a wiki page, a doc or a ticket that explains
            something about this app.
          </li>
          <li>
            Fix something — "Access is approved by your team lead, not IT."
          </li>
          <li>Ask a question — "Can contractors get access?"</li>
          <li>Attach a screenshot — paste it, drop it or use the paperclip.</li>
        </ul>
        <p className="comments-help__note">
          <ResourceDetailFeedbackNote appSlug={appSlug} appName={appName} />
          {!hasPluginNote && (
            <>
              Every note is reviewed. Facts that check out update the card and
              are marked Used as source.
            </>
          )}
        </p>
      </div>
    </>
  )
}
