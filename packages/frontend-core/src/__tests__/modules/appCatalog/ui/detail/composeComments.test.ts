import type { Claim, FeedbackView } from '@igstack/app-catalog-backend-core'
import { describe, expect, it } from 'vitest'
import {
  composeComments,
  countPending,
} from '~/modules/appCatalog/ui/detail/composeComments'

const note = (over: Partial<FeedbackView> = {}): FeedbackView => ({
  id: 'n1',
  authorName: 'Merry Mole',
  body: 'Leads approve access.',
  subject: null,
  resourceSlug: 'example-app',
  resourceName: 'Example App',
  attachmentIds: [],
  createdAt: '2026-10-10T10:00:00.000Z',
  reviewedAt: null,
  editedAt: null,
  isMine: false,
  isSystem: false,
  canEditUntil: null,
  status: null,
  reviewerReply: null,
  ...over,
})
const claim = (over: Partial<Claim> = {}): Claim => ({
  text: 'Team leads approve access.',
  addedAt: '2026-10-11',
  origin: 'feedback:n1',
  status: 'active',
  ...over,
})
const shape = (notes: FeedbackView[], claims: Claim[]) =>
  composeComments(notes, claims).map(({ who, text, badge }) => ({
    who,
    text,
    badge,
  }))

describe('composeComments — one entry per visitor note', () => {
  it('an open note is Pending, in the visitor’s words', () => {
    expect(shape([note()], [])).toEqual([
      { who: 'Merry Mole', text: 'Leads approve access.', badge: 'pending' },
    ])
  })

  it('an applied note whose claim is active is Used as source, once', () => {
    expect(shape([note({ status: 'applied' })], [claim()])).toEqual([
      { who: 'Merry Mole', text: 'Leads approve access.', badge: 'used' },
    ])
  })

  it('an applied note whose claim is still in review is Pending', () => {
    expect(
      shape([note({ status: 'applied' })], [claim({ status: 'review' })]),
    ).toEqual([
      { who: 'Merry Mole', text: 'Leads approve access.', badge: 'pending' },
    ])
  })

  it('an open note with a review claim is one Pending entry', () => {
    expect(shape([note()], [claim({ status: 'review' })])).toEqual([
      { who: 'Merry Mole', text: 'Leads approve access.', badge: 'pending' },
    ])
  })

  it('an acknowledged note with a review claim is Pending', () => {
    expect(
      shape([note({ status: 'acknowledged' })], [claim({ status: 'review' })]),
    ).toEqual([
      { who: 'Merry Mole', text: 'Leads approve access.', badge: 'pending' },
    ])
  })

  it('an applied note with no live claim has no badge', () => {
    expect(
      shape(
        [note({ status: 'applied' })],
        [claim({ status: 'archived', archiveReason: 'gone' })],
      ),
    ).toEqual([
      { who: 'Merry Mole', text: 'Leads approve access.', badge: null },
    ])
  })
})

describe('composeComments — claims with no note in the list', () => {
  it('shows the claim text, badged by its status', () => {
    expect(
      shape(
        [],
        [
          claim({
            text: 'Active.',
            origin: 'feedback:gone',
            addedAt: '2026-10-02',
          }),
          claim({
            text: 'In review.',
            origin: 'feedback:gone2',
            status: 'review',
            addedAt: '2026-10-01',
          }),
        ],
      ),
    ).toEqual([
      { who: 'A visitor', text: 'Active.', badge: 'used' },
      { who: 'A visitor', text: 'In review.', badge: 'pending' },
    ])
  })

  it('names a person or team origin, and a URL by its host', () => {
    expect(
      shape(
        [],
        [
          claim({ origin: 'Tools team', addedAt: '2026-10-03' }),
          claim({
            origin: 'https://wiki.example.com/page/1',
            addedAt: '2026-10-02',
          }),
          claim({ origin: undefined, addedAt: '2026-10-01' }),
        ],
      ).map((e) => e.who),
    ).toEqual(['Tools team', 'wiki.example.com', null])
  })

  it('hides archived claims', () => {
    expect(
      shape([], [claim({ status: 'archived', origin: 'Tools team' })]),
    ).toEqual([])
  })
})

describe('composeComments — order and count', () => {
  it('is newest first across notes and claims', () => {
    const texts = composeComments(
      [
        note({ id: 'a', body: 'Old note.', createdAt: '2026-10-01T09:00:00Z' }),
        note({ id: 'b', body: 'New note.', createdAt: '2026-10-12T09:00:00Z' }),
      ],
      [
        claim({
          text: 'Middle claim.',
          origin: 'Tools team',
          addedAt: '2026-10-05',
        }),
      ],
    ).map((e) => e.text)
    expect(texts).toEqual(['New note.', 'Middle claim.', 'Old note.'])
  })

  it('counts exactly the Pending entries', () => {
    const notes = [
      note({ id: 'a' }),
      note({ id: 'b', status: 'applied' }),
      note({ id: 'c', status: 'acknowledged' }),
    ]
    const claims = [
      claim({ origin: 'feedback:a', status: 'review' }),
      claim({ origin: 'feedback:b', status: 'review' }),
      claim({ origin: 'Tools team', status: 'review' }),
      claim({ origin: 'Tools team', status: 'active' }),
    ]
    // a (open + review claim) is one, b is one, the team's review claim is one.
    expect(countPending(notes, claims)).toBe(3)
    expect(
      composeComments(notes, claims).filter((e) => e.badge === 'pending'),
    ).toHaveLength(3)
  })
})
