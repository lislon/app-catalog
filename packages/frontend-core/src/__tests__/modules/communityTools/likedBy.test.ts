import { describe, expect, it } from 'vitest'
import type { CommunityTool } from '@igstack/app-catalog-shared-core'
import { likedByText, withLike } from '~/modules/communityTools/likedBy'

describe('likedByText', () => {
  it('names two, and counts the rest', () => {
    expect(likedByText([], 0)).toBe('No likes yet')
    expect(likedByText(['Ann'], 1)).toBe('Liked by Ann')
    expect(likedByText(['Ann', 'Bob'], 2)).toBe('Liked by Ann and Bob')
    expect(likedByText(['Ann', 'Bob', 'Cy'], 3)).toBe(
      'Liked by Ann, Bob and 1 other',
    )
    expect(likedByText(['Ann', 'Bob', 'Cy'], 12)).toBe(
      'Liked by Ann, Bob and 10 others',
    )
  })
})

describe('withLike', () => {
  const tool = {
    likes: 2,
    likedByMe: false,
    likedBy: ['Bob', 'Cy'],
  } as CommunityTool

  it('adds my like first, and takes it back again', () => {
    const liked = withLike(tool, true, 'Ann')
    expect(liked).toMatchObject({
      likes: 3,
      likedByMe: true,
      likedBy: ['Ann', 'Bob', 'Cy'],
    })
    expect(withLike(liked, false, 'Ann')).toMatchObject(tool)
  })

  it('leaves a tool that already reads that way alone', () => {
    expect(withLike(tool, false, 'Ann')).toBe(tool)
  })
})
