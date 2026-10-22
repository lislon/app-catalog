import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from '~/modules/auth/AuthContext'

// The session endpoint answers `{ ...session, isAdmin }`: admin rights sit
// beside the user, not on it.
function serveSession(body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => body }),
  )
}

function renderAuth() {
  return renderHook(() => useAuth(), {
    wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
  })
}

describe('AuthProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('session with top-level isAdmin yields user.isAdmin true', async () => {
    serveSession({ user: { id: 'u1', name: 'Ada Admin' }, isAdmin: true })

    const { result } = renderAuth()

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.user).toEqual({
      id: 'u1',
      name: 'Ada Admin',
      isAdmin: true,
    })
    // The optimistic copy the next load renders from keeps it too.
    expect(JSON.parse(localStorage.getItem('ac_auth_user') ?? 'null')).toEqual(
      result.current.user,
    )
  })

  it('session without isAdmin yields user.isAdmin false', async () => {
    serveSession({ user: { id: 'u2', name: 'Robin Reader' } })

    const { result } = renderAuth()

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.user).toEqual({
      id: 'u2',
      name: 'Robin Reader',
      isAdmin: false,
    })
  })
})
