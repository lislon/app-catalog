import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'

import {
  SharedNetwork,
  given,
  magazine,
  suppressConsole,
} from '@igstack/app-catalog-test-kit'

describe('Auth Integration', () => {
  it('unauthenticated user sees no Login button', async () => {
    suppressConsole(/Failed to fetch session/)

    await given(
      magazine.full(({ backendCfg }) => {
        backendCfg.withUser({ isAuthenticated: false })
      }),
    )

    // The catalog is browsable anonymously, so the header advertises no login
    // entry point. Wait for the anonymous header to settle before asserting
    // absence, or this passes while the session is still loading.
    await waitFor(() => {
      expect(screen.queryByTestId('user-avatar-button')).not.toBeInTheDocument()
    })
    expect(screen.queryByText('Login')).not.toBeInTheDocument()
  })

  it('authenticated user sees user avatar initial', async () => {
    await given(
      magazine.full(({ backendCfg }) => {
        backendCfg.withUser({ name: 'Alice Admin', isAdmin: true })
      }),
    )

    await waitFor(() => {
      expect(screen.getByTestId('user-avatar-button')).toBeInTheDocument()
    })
  })

  it('authenticated non-admin user sees user avatar', async () => {
    // Default magazine user is authenticated non-admin
    await given(magazine.full())

    await waitFor(() => {
      expect(screen.getByTestId('user-avatar-button')).toBeInTheDocument()
    })
  })

  it('DEV Login button appears when devLoginEnabled is true', async () => {
    suppressConsole(/Failed to fetch session/)

    await given(
      magazine.full(({ backendCfg, networkCfg }) => {
        backendCfg.withUser({ isAuthenticated: false })
        networkCfg.overrideConfig((catalog) => {
          const provider = SharedNetwork.authGetProviders({
            devLoginEnabled: true,
          })
          catalog.replace(provider.scopeKey, provider.handler)
        })
      }),
    )

    await waitFor(() => {
      expect(screen.getByText('DEV Login')).toBeInTheDocument()
    })
    expect(screen.queryByText('Login')).not.toBeInTheDocument()
  })

  it('DEV Login button does not appear when devLoginEnabled is false', async () => {
    suppressConsole(/Failed to fetch session/)

    await given(
      magazine.full(({ backendCfg }) => {
        backendCfg.withUser({ isAuthenticated: false })
      }),
    )

    await waitFor(() => {
      expect(screen.queryByTestId('user-avatar-button')).not.toBeInTheDocument()
    })
    expect(screen.queryByText('DEV Login')).not.toBeInTheDocument()
  })

  it('authenticated user can access Sign out option', async () => {
    await given(
      magazine.full(({ backendCfg }) => {
        backendCfg.withUser({ name: 'Test User' })
      }),
    )

    // Wait for user avatar to appear
    const avatar = await screen.findByTestId('user-avatar-button')
    // Open the user dropdown menu
    await userEvent.click(avatar)

    await waitFor(() => {
      expect(screen.getByText('Sign out')).toBeInTheDocument()
    })
  })

  // The header button that used to open this modal is gone, so the login route
  // is now the entry point -- and keeping it reachable is the whole point of
  // hiding the button rather than removing auth.
  it('login route shows DEV Quick Login when devLoginEnabled is true', async () => {
    suppressConsole(/Failed to fetch session/)

    await given(
      magazine.full(({ backendCfg, networkCfg }) => {
        backendCfg.withUser({ isAuthenticated: false })
        networkCfg.overrideConfig((catalog) => {
          const provider = SharedNetwork.authGetProviders({
            devLoginEnabled: true,
          })
          catalog.replace(provider.scopeKey, provider.handler)
        })
      }),
      { initialRoute: '/login' },
    )

    await waitFor(() => {
      expect(screen.getByText('DEV Quick Login')).toBeInTheDocument()
    })
  })
})
