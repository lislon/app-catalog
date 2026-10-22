import { describe, expect, it } from 'vitest'
import type { CommunityTool } from '@igstack/app-catalog-shared-core'
import { likedByText, withLike } from '~/modules/communityTools/likedBy'

describe('likedByText', () => {
  const text = (likes: number, likedByMe: boolean, likedBy: string[]) =>
    likedByText({ likes, likedByMe, likedBy })
  const nine = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

  it('names colleagues, the last after "and"', () => {
    expect(text(0, false, [])).toBe('No likes yet')
    expect(text(1, false, ['Ann'])).toBe('Liked by Ann')
    expect(text(3, false, ['Ann', 'Bob', 'Cy'])).toBe(
      'Liked by Ann, Bob and Cy',
    )
  })

  it('puts you first', () => {
    expect(text(1, true, [])).toBe('Liked by you')
    expect(text(2, true, ['Ann'])).toBe('Liked by you and Ann')
  })

  it('names eight colleagues at most, and counts the rest', () => {
    expect(text(13, true, nine)).toBe(
      'Liked by you, A, B, C, D, E, F, G, H and 4 others',
    )
    expect(text(9, false, nine)).toBe(
      'Liked by A, B, C, D, E, F, G, H and 1 other',
    )
  })
})

describe('withLike', () => {
  const tool = { likes: 2, likedByMe: false, likedBy: ['Bob'] } as CommunityTool

  it('counts my like in, and out again', () => {
    const liked = withLike(tool, true)
    expect(liked).toMatchObject({ likes: 3, likedByMe: true, likedBy: ['Bob'] })
    expect(withLike(liked, false)).toMatchObject(tool)
  })

  it('leaves a tool that already reads that way alone', () => {
    expect(withLike(tool, false)).toBe(tool)
  })
})
