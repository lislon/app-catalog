import { describe, expect, it } from 'vitest'
import { naturalSort } from '../../utils/naturalSort'

describe('naturalSort', () => {
  it('should sort filenames with parenthesized numbers correctly', () => {
    const expected = [
      'abc (1).png',
      'abc (3).png',
      'abc (10).png',
      'abc (11).png',
    ]
    const unsorted = [
      'abc (10).png',
      'abc (1).png',
      'abc (11).png',
      'abc (3).png',
    ]

    const result = naturalSort(unsorted)

    expect(result).toEqual(expected)
  })
})
