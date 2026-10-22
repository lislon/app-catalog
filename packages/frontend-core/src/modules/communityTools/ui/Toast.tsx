import { AlertTriangle, Check, Star, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '~/lib/utils'

export interface ToastMessage {
  /** Changes for every new toast, so the same text twice still restarts the timer. */
  id: number
  tone: 'info' | 'ok' | 'error'
  text: React.ReactNode
  action?: { label: string; run: () => void }
}

const SHOW_MS = 5000

const ICONS = { info: Star, ok: Check, error: AlertTriangle } as const

/**
 * One toast at a time, bottom-centre. It leaves after 5 s unless the pointer or
 * focus is on it. The live region is always mounted, so the first toast is
 * announced too; an error is an alert.
 */
export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastMessage | null
  onDismiss: () => void
}) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
    >
      {toast && (
        <ToastBody key={toast.id} toast={toast} onDismiss={onDismiss} />
      )}
    </div>
  )
}

/** Keyed by toast id, so a new toast starts un-held with a fresh timer. */
function ToastBody({
  toast,
  onDismiss,
}: {
  toast: ToastMessage
  onDismiss: () => void
}) {
  const [held, setHeld] = useState(false)

  useEffect(() => {
    if (held) return
    const timer = setTimeout(onDismiss, SHOW_MS)
    return () => clearTimeout(timer)
  }, [held, onDismiss])

  const Icon = ICONS[toast.tone]

  return (
    <div
      data-testid="toast"
      role={toast.tone === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
      className={cn(
        'pointer-events-auto inline-flex max-w-full items-center gap-2.5 rounded-xl py-2.5 pr-2.5 pl-3.5 text-sm font-semibold shadow-lg',
        toast.tone === 'error'
          ? 'bg-destructive text-white'
          : 'bg-foreground text-background',
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          'size-4 shrink-0',
          toast.tone === 'info' && 'fill-amber-400 text-amber-400',
          toast.tone === 'ok' && 'text-green-400',
        )}
      />
      <span>{toast.text}</span>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action?.run()
            onDismiss()
          }}
          className="rounded-md px-2 py-1 font-bold underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-current"
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        className="rounded-md p-1 opacity-70 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-current"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  )
}
