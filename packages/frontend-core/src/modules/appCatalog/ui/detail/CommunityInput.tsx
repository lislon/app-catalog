import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Paperclip, X } from 'lucide-react'
import React from 'react'
import { useTRPC } from '~/api/infra/trpc'
import { cn } from '~/lib/utils'
import { ResourceDetailFeedbackNote, useSlotFilled } from '~/modules/extensions'
import { Button } from '~/ui/button'
import {
  attachmentUrl,
  readAttachments,
  readDraft,
  writeAttachments,
  writeDraft,
} from './communityDraft'
import type { PendingImage } from './communityDraft'
import { formatCommunityError } from './communityError'

const MAX_HEIGHT = 200

/** How long the Share highlight stays on the field, ms. */
const FLASH_MS = 900

/** Mirrors the server's cap, which refuses anything above it regardless. */
const MAX_ATTACHMENTS = 3

const UPLOAD_URL = '/api/feedback-attachments/upload'

/** What the card holds on to, so "Share what you know" can point at the field. */
export interface CommunityInputHandle {
  /** Focuses the field and highlights it briefly. Re-triggers on every call. */
  focus: () => void
}

const isImage = (file: File) => file.type.startsWith('image/')

/**
 * Upload on pick, not on send: the person sees whether their screenshot
 * arrived while they can still do something about it, and Send stays one fast
 * request that cannot half-fail with images in flight.
 */
async function upload(files: File[]): Promise<string[] | string> {
  const form = new FormData()
  for (const file of files) form.append('image', file)
  try {
    const response = await fetch(UPLOAD_URL, {
      method: 'POST',
      body: form,
      // The visitor cookie is the identity the upload is recorded against, and
      // it is httpOnly — so it has to ride along explicitly.
      credentials: 'same-origin',
    })
    const payload: unknown = await response.json().catch(() => null)
    const field = (key: string): unknown =>
      typeof payload === 'object' && payload !== null
        ? (payload as Record<string, unknown>)[key]
        : undefined
    const ids = field('ids')
    if (response.ok && Array.isArray(ids)) return ids.map(String)
    const reported = field('error')
    return typeof reported === 'string'
      ? reported
      : 'Could not attach that image'
  } catch {
    return 'Could not attach that image'
  }
}

/**
 * The card's one ask for more information, at the top of Behind this card. A
 * one-line pill at rest; on first focus Send and the note line appear and stay.
 * The field grows into a box as the text wraps. Screenshots come in through the
 * paperclip, paste or drop, and a screenshot alone is a valid note.
 */
export function CommunityInput({
  appSlug,
  appName,
  ref,
}: {
  appSlug: string
  appName: string
  ref?: React.Ref<CommunityInputHandle>
}) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  // Seeded from storage so a draft survives the tab panel unmounting under it.
  const [text, setText] = React.useState(() => readDraft(appSlug))
  const [images, setImages] = React.useState<PendingImage[]>(() =>
    readAttachments(appSlug),
  )
  const [engaged, setEngaged] = React.useState(
    () => text !== '' || images.length > 0,
  )
  const [sent, setSent] = React.useState(false)
  // Counts successful sends, so a click on Send hands focus back every time.
  const [sends, setSends] = React.useState(0)
  const [uploading, setUploading] = React.useState(false)
  const [uploadError, setUploadError] = React.useState<string | null>(null)
  const [dragging, setDragging] = React.useState(false)
  // The guard events read, set synchronously: `uploading` only updates on the
  // next render, so a second paste or drop in the same tick would slip past it.
  const inFlightRef = React.useRef(false)
  const dragDepthRef = React.useRef(0)
  // Cleared draft stays cleared: Esc increments this; the upload checks it
  // on completion so an in-flight upload does not re-add its image.
  const draftGenRef = React.useRef(0)
  const [height, setHeight] = React.useState(32)
  const fieldRef = React.useRef<HTMLTextAreaElement>(null)
  // A hidden twin measures the height the text needs, so the real field can
  // animate to it. Setting `height: auto` on the real one snaps instead.
  const mirrorRef = React.useRef<HTMLTextAreaElement>(null)
  const fileRef = React.useRef<HTMLInputElement>(null)
  const formRef = React.useRef<HTMLFormElement>(null)
  const flashTimerRef = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  const hasPluginNote = useSlotFilled('resourceDetailFeedbackNote')

  // Detect coarse pointer (touch) to adjust placeholder and hide keyboard hints.
  const [isCoarse, setIsCoarse] = React.useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(pointer: coarse)').matches
  })
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(pointer: coarse)')
    const handler = () => setIsCoarse(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  React.useEffect(() => writeDraft(appSlug, text), [appSlug, text])
  React.useEffect(() => writeAttachments(appSlug, images), [appSlug, images])

  // The class goes on the form, whose className React never rewrites, and
  // is removed and re-added with a reflow between so a second call restarts
  // the highlight instead of merely extending it.
  React.useImperativeHandle(ref, () => ({
    focus: () => {
      fieldRef.current?.focus()
      const form = formRef.current
      if (!form) return
      form.classList.remove('is-flash')
      void form.offsetWidth
      form.classList.add('is-flash')
      clearTimeout(flashTimerRef.current)
      flashTimerRef.current = setTimeout(
        () => form.classList.remove('is-flash'),
        FLASH_MS,
      )
    },
  }))
  React.useEffect(() => () => clearTimeout(flashTimerRef.current), [])

  const add = useMutation(
    trpc.feedback.add.mutationOptions({
      onSuccess: () => {
        setText('')
        setImages([])
        setUploadError(null)
        setSent(true)
        setSends((n) => n + 1)
        void queryClient.invalidateQueries({
          queryKey: trpc.feedback.list.queryKey({ resourceSlug: appSlug }),
        })
      },
    }),
  )

  // Focus stays in the field so the next Tab doesn't walk the grid behind the scrim.
  React.useEffect(() => {
    if (sends) fieldRef.current?.focus()
  }, [sends])

  const typing = text.trim() !== ''
  const canSend = typing || images.length > 0

  const fit = React.useCallback(() => {
    const field = fieldRef.current
    const mirror = mirrorRef.current
    if (!field || !mirror) return
    mirror.style.width = `${field.offsetWidth}px`
    mirror.value = text || ' '
    // Compute ONE_LINE from the actual field styles (varies by viewport width).
    const styles = window.getComputedStyle(field)
    const lineHeight = parseFloat(styles.lineHeight)
    const paddingTop = parseFloat(styles.paddingTop)
    const paddingBottom = parseFloat(styles.paddingBottom)
    const borderTop = parseFloat(styles.borderTopWidth)
    const borderBottom = parseFloat(styles.borderBottomWidth)
    const oneLine =
      lineHeight + paddingTop + paddingBottom + borderTop + borderBottom
    // +2: scrollHeight excludes the border, the box height includes it.
    setHeight(Math.min(Math.max(mirror.scrollHeight + 2, oneLine), MAX_HEIGHT))
  }, [text])
  React.useLayoutEffect(fit, [fit])
  React.useEffect(() => {
    const field = fieldRef.current
    if (!field || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(fit)
    observer.observe(field)
    return () => observer.disconnect()
  }, [fit])

  /**
   * One upload at a time: a paste or drop while one is in flight is ignored,
   * and the "Attaching…" line says why. The updater clamps as well, so the
   * draft can never hold more than the server accepts on send.
   */
  const attach = async (picked: File[]) => {
    const files = picked.filter(isImage)
    if (files.length === 0 || inFlightRef.current) return
    setEngaged(true)
    const room = MAX_ATTACHMENTS - images.length
    if (room <= 0) {
      setUploadError(`Up to ${MAX_ATTACHMENTS} images`)
      return
    }
    setUploadError(null)
    inFlightRef.current = true
    setUploading(true)
    const startGen = draftGenRef.current
    const result = await upload(files.slice(0, room))
    inFlightRef.current = false
    setUploading(false)
    // Draft was cleared (Esc) while upload was in flight: stay cleared.
    if (draftGenRef.current !== startGen) return
    if (typeof result === 'string') {
      setUploadError(result)
      return
    }
    const newImages = result.map((id, i) => ({
      id,
      name: files[i]?.name ?? 'image',
    }))
    // Merge into both state and persisted draft so unmount restores it.
    setImages((current) => {
      const updated = [...current, ...newImages].slice(0, MAX_ATTACHMENTS)
      writeAttachments(appSlug, updated)
      return updated
    })
    if (files.length > room)
      setUploadError(`Only the first ${room} were attached`)
  }

  /** Only a drag carrying files is ours; dragged text still drops into the field. */
  const carriesFiles = (e: React.DragEvent) =>
    [...e.dataTransfer.types].includes('Files')

  const submit = () => {
    if (!canSend || add.isPending || uploading) return
    const body = text.trim()
    add.mutate({
      resourceSlug: appSlug,
      ...(body ? { body } : {}),
      ...(images.length > 0 ? { attachmentIds: images.map((i) => i.id) } : {}),
    })
  }

  return (
    <form
      ref={formRef}
      // State rides on data attributes: the className stays static so the
      // imperative `is-flash` below survives a re-render.
      className="know-more"
      data-engaged={engaged || undefined}
      data-drop={dragging || undefined}
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      onDragEnter={(e) => {
        if (!carriesFiles(e)) return
        dragDepthRef.current += 1
        setDragging(true)
      }}
      onDragOver={(e) => {
        // Accepting the drop is what lets it fire.
        if (carriesFiles(e)) e.preventDefault()
      }}
      onDragLeave={(e) => {
        if (!carriesFiles(e)) return
        // Every child the drag crosses fires its own enter and leave, so only
        // the last leave means the drag left the form.
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
        if (dragDepthRef.current === 0) setDragging(false)
      }}
      onDrop={(e) => {
        if (!carriesFiles(e)) return
        e.preventDefault()
        dragDepthRef.current = 0
        setDragging(false)
        void attach([...e.dataTransfer.files])
      }}
    >
      {images.length > 0 && (
        <ul className="know-more-thumbs">
          {images.map((image) => (
            <li key={image.id} className="know-more-thumb">
              <img src={attachmentUrl(image.id)} alt={image.name} />
              <button
                type="button"
                aria-label={`Remove ${image.name}`}
                onClick={() =>
                  setImages((current) =>
                    current.filter((i) => i.id !== image.id),
                  )
                }
              >
                <X className="size-2.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className={cn('know-more-field', height > 40 && 'is-multi')}>
        <button
          type="button"
          className="know-more-clip"
          aria-label="Attach a screenshot"
          title="Attach a screenshot"
          aria-busy={uploading || undefined}
          disabled={uploading || images.length >= MAX_ATTACHMENTS}
          onClick={() => fileRef.current?.click()}
        >
          <Paperclip className="size-4" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          tabIndex={-1}
          aria-hidden
          className="sr-only"
          onChange={(e) => {
            void attach([...(e.target.files ?? [])])
            // Cleared so picking the SAME file again still fires a change.
            e.target.value = ''
          }}
        />
        <textarea
          ref={fieldRef}
          rows={1}
          value={text}
          aria-label={`Know more about ${appName}?`}
          placeholder={
            isCoarse ? 'Know more? Tell us' : 'Know more? Type it, press Enter'
          }
          style={{
            height,
            overflowY: height >= MAX_HEIGHT ? 'auto' : 'hidden',
          }}
          onFocus={() => setEngaged(true)}
          onChange={(e) => {
            setText(e.target.value)
            setSent(false)
            if (add.isError) add.reset()
          }}
          onPaste={(e) => {
            const files = [...e.clipboardData.files].filter(isImage)
            if (files.length === 0) return
            e.preventDefault()
            void attach(files)
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
            // Esc clears a draft, and only a draft: with nothing typed or
            // attached it must reach the card's layer so the card still closes.
            if (
              e.key === 'Escape' &&
              !e.nativeEvent.isComposing &&
              (text !== '' || images.length > 0)
            ) {
              e.preventDefault()
              e.stopPropagation()
              draftGenRef.current += 1
              setText('')
              setImages([])
            }
          }}
        />
        <Button
          type="submit"
          size="sm"
          className="know-more-send"
          tabIndex={engaged ? 0 : -1}
          aria-hidden={engaged ? undefined : true}
          disabled={!canSend || add.isPending || uploading}
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
      {!isCoarse && (
        <p className={cn('know-more-hint', typing && 'is-on')}>
          Enter sends · Shift+Enter new line · Esc clears · paste or drop a
          screenshot
        </p>
      )}
      <p className="know-more-attaching" aria-live="polite">
        {uploading ? 'Attaching…' : ''}
      </p>
      {(add.isError || uploadError) && (
        <p role="alert" className="know-more-error">
          {add.isError
            ? `Could not send: ${formatCommunityError(add.error)}. Your note is still here.`
            : uploadError}
        </p>
      )}
      <p role="status" className={cn('know-more-sent', sent && 'is-on')}>
        {sent ? 'Thanks — sent. It shows below.' : ''}
      </p>
      <div className="know-more-what-next">
        <ResourceDetailFeedbackNote appSlug={appSlug} appName={appName} />
        {!hasPluginNote && <DefaultFeedbackNote />}
      </div>
    </form>
  )
}

/** OSS default: what happens to the note the user sends. */
function DefaultFeedbackNote() {
  return <>A maintainer reads every note and updates the card.</>
}
