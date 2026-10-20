/**
 * Where a half-written note lives while it is not sent.
 *
 * The input sits inside a tab panel, and a panel unmounts while its tab is not
 * the active one — so component state alone loses whatever someone typed or
 * attached the moment they look at another tab. Losing someone's words is the
 * one failure this feature cannot afford: reporting has to cost almost nothing,
 * and "I typed it and it vanished" is how a person learns not to bother.
 *
 * Session rather than local storage: a draft is in-flight work, not a
 * preference. Keyed by slug so two entries do not share one draft. Storage can
 * throw outright in a locked-down context; a lost draft is not worth taking the
 * card down over, so every access swallows that.
 */

/** One already-uploaded image waiting to be sent with the words. */
export interface PendingImage {
  id: string
  name: string
}

const draftKey = (slug: string) => `ac.feedback.draft.${slug}`
const imagesKey = (slug: string) => `ac.feedback.images.${slug}`

export function readDraft(slug: string): string {
  try {
    return sessionStorage.getItem(draftKey(slug)) ?? ''
  } catch {
    return ''
  }
}

export function writeDraft(slug: string, value: string): void {
  try {
    if (value) sessionStorage.setItem(draftKey(slug), value)
    else sessionStorage.removeItem(draftKey(slug))
  } catch {
    /* see the module comment */
  }
}

/**
 * Images upload the moment they are picked, so the draft holds ids rather than
 * files. Dropping an id here does NOT delete the image; the server sweeps
 * whatever is never sent, which keeps "remove" instant.
 */
export function readAttachments(slug: string): PendingImage[] {
  try {
    const raw = sessionStorage.getItem(imagesKey(slug))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (entry): entry is PendingImage =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as PendingImage).id === 'string' &&
        typeof (entry as PendingImage).name === 'string',
    )
  } catch {
    return []
  }
}

export function writeAttachments(slug: string, images: PendingImage[]): void {
  try {
    if (images.length > 0) {
      sessionStorage.setItem(imagesKey(slug), JSON.stringify(images))
    } else {
      sessionStorage.removeItem(imagesKey(slug))
    }
  } catch {
    /* see the module comment */
  }
}

/** The stored image, at whatever size the browser lays it out. */
export function attachmentUrl(id: string): string {
  return `/api/feedback-attachments/${id}`
}
