import { describe, expect, it } from 'vitest'
import { naturalSort } from '../../utils/naturalSort'

describe('naturalSort', () => {
  it('should sort filenames with parenthesized numbers correctly', () => {
    const actual = naturalSort([
      'abc (10).png',
      'abc (1).png',
      'abc (11).png',
      'abc (3).png',
    ])

    expect(actual).toEqual([
      'abc (1).png',
      'abc (3).png',
      'abc (10).png',
      'abc (11).png',
    ])
  })
})
