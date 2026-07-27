import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { given } from './harness/given'
import { magazine } from './mock-backend/magazines'

/**
 * Regression for #7 (root cause in #6): the root route's `notFoundComponent`
 * (`NotFoundError`) renders `MainLayout → Header → useAuth()`. Before the fix
 * the fallback rendered OUTSIDE `AuthProvider`, so any unknown URL threw
 * `useAuth must be used within AuthProvider` and the app showed its "Ooops!"
 * error page instead of a clean 404.
 */
describe('Unknown URL renders NotFound without a useAuth error', () => {
  it('shows the 404 page (not the useAuth error) for a bogus URL', async () => {
    const { ui } = await given(magazine.full(), {
      initialRoute: '/nonexistent-xyz',
    })

    // The clean NotFound UI is rendered.
    await waitFor(() => {
      expect(screen.getByText('404 Not Found')).toBeInTheDocument()
    })

    // And crucially: NO useAuth error surfaced. The header (which calls
    // useAuth) must render inside a provider, so the global error page must
    // not appear at all.
    expect(
      screen.queryByText(/useAuth must be used within AuthProvider/),
    ).not.toBeInTheDocument()
    expect(() => ui.globalError()).toThrow(/No global error found/)
  })
})
