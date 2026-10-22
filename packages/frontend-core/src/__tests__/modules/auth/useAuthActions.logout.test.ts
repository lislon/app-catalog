import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AUTH_USER_STORAGE_KEY } from '~/modules/auth/AuthContext'
import { useAuthActions } from '~/modules/auth/useAuthActions'

const originalLocation = window.location
const reload = vi.fn()

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('{}', { status: 200 })),
  )
  // jsdom's location cannot be spied on; swap in one whose reload is observable.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, href: originalLocation.href, reload },
  })
})

afterEach(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: originalLocation,
  })
  vi.unstubAllGlobals()
  reload.mockClear()
  localStorage.clear()
})

describe('useAuthActions.logout', () => {
  it('reloads the current page signed out instead of going home', async () => {
    const page = 'http://localhost:3000/app/sample-review-app?tab=access'
    window.location.href = page
    localStorage.setItem(
      AUTH_USER_STORAGE_KEY,
      JSON.stringify({ id: 'u1', name: 'Signed In' }),
    )
    const { result } = renderHook(() => useAuthActions())

    await result.current.logout()

    expect(reload).toHaveBeenCalledOnce()
    expect(window.location.href).toBe(page)
    // The provider hydrates from this before the session fetch returns, so a
    // leftover entry would flash the old user on the reloaded page.
    expect(localStorage.getItem(AUTH_USER_STORAGE_KEY)).toBeNull()
  })
})
