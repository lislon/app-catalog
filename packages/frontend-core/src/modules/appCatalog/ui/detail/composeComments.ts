import type {
  Claim,
  FeedbackView as Note,
} from '@igstack/app-catalog-backend-core'

/** `pending` = still being checked; `used` = the card now relies on it. */
export type CommentBadge = 'pending' | 'used' | null

/** One row of the Comments feed. */
export interface CommentEntry {
  key: string
  /** Null when a claim names no origin at all. */
  who: string | null
  /** Raw ISO date or instant, for the `title`. */
  at: string
  /** Null for a note sent without words; the feed says what it carried instead. */
  text: string | null
  badge: CommentBadge
  /** The visitor's row, when the entry is one — what Edit, Dismiss and screenshots hang off. */
  note?: Note
}

const FEEDBACK_ORIGIN = 'feedback:'

function noteBadge(note: Note, linked: Claim[]): CommentBadge {
  if (note.status === null) return 'pending'
  if (note.status === 'acknowledged') return null
  if (linked.some((c) => c.status === 'review')) return 'pending'
  if (linked.some((c) => c.status === 'active')) return 'used'
  return null
}

/** Who said a claim that has no note in the list. A URL reads as its host. */
function claimWho(origin: string | undefined): string | null {
  if (!origin) return null
  if (origin.startsWith(FEEDBACK_ORIGIN)) return 'A visitor'
  if (/^https?:\/\//.test(origin)) {
    try {
      return new URL(origin).host
    } catch {
      return origin
    }
  }
  return origin
}

const time = (at: string) => Date.parse(at) || 0

/**
 * Everything said about an entry, one entry per visitor note, newest first.
 *
 * A claim whose origin is `feedback:<id>` belongs to that note: it sets the
 * note's badge and is not shown again. A claim with no note in the list (its
 * row is gone, or it came from a person, team or URL) stands on its own, in
 * its own words. Archived claims are not shown.
 */
export function composeComments(
  notes: Note[],
  claims: Claim[],
): CommentEntry[] {
  const ids = new Set(notes.map((n) => n.id))
  const byNote = new Map<string, Claim[]>()
  const standalone: Claim[] = []
  for (const claim of claims) {
    if (claim.status === 'archived') continue
    const id = claim.origin?.startsWith(FEEDBACK_ORIGIN)
      ? claim.origin.slice(FEEDBACK_ORIGIN.length)
      : null
    if (id !== null && ids.has(id)) {
      byNote.set(id, [...(byNote.get(id) ?? []), claim])
    } else {
      standalone.push(claim)
    }
  }
  const entries: CommentEntry[] = [
    ...notes.map(
      (note): CommentEntry => ({
        key: note.id,
        who: note.authorName,
        at: note.createdAt,
        text: note.body,
        badge: noteBadge(note, byNote.get(note.id) ?? []),
        note,
      }),
    ),
    ...standalone.map(
      (claim, i): CommentEntry => ({
        key: `claim-${i}`,
        who: claimWho(claim.origin),
        at: claim.addedAt,
        text: claim.text,
        badge: claim.status === 'active' ? 'used' : 'pending',
      }),
    ),
  ]
  return entries.sort((a, b) => time(b.at) - time(a.at))
}

/** The Behind this card count: exactly the feed's Pending badges. */
export function countPending(notes: Note[], claims: Claim[]): number {
  return composeComments(notes, claims).filter((e) => e.badge === 'pending')
    .length
}
