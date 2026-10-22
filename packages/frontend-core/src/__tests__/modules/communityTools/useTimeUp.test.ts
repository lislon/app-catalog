import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTimeUp } from '~/modules/communityTools/useTimeUp'

const TWO_MINUTES = 2 * 60 * 1000

describe('useTimeUp', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('turns true at the limit and not a moment before', () => {
    const { result } = renderHook(() => useTimeUp('fresh-tool', TWO_MINUTES))
    act(() => vi.advanceTimersByTime(TWO_MINUTES - 1))
    expect(result.current).toBe(false)
    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe(true)
  })

  it('starts again for a new key', () => {
    const { result, rerender } = renderHook(
      ({ key }) => useTimeUp(key, TWO_MINUTES),
      { initialProps: { key: 'fresh-tool' } },
    )
    act(() => vi.advanceTimersByTime(TWO_MINUTES))
    expect(result.current).toBe(true)
    rerender({ key: 'other-tool' })
    expect(result.current).toBe(false)
    act(() => vi.advanceTimersByTime(TWO_MINUTES))
    expect(result.current).toBe(true)
  })
})
