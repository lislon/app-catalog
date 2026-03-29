import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'

import { given } from './harness/given'
import { magazine } from './mock-backend/magazines'
import { SharedNetwork } from './mock-network/SharedNetwork'
import { suppressConsole } from './tools/suppressConsole'

describe('Auth Integration', () => {
  it('unauthenticated user sees Login button', async () => {
    suppressConsole(/Failed to fetch session/)

    await given(
      magazine.full(({ backendCfg }) => {
        backendCfg.withUser({ isAuthenticated: false })
      }),
    )

    await waitFor(() => {
      expect(screen.getByText('Login')).toBeInTheDocument()
    })
  })

  it('authenticated user sees user avatar initial', async () => {
    await given(
      magazine.full(({ backendCfg }) => {
        backendCfg.withUser({ name: 'Alice Admin', isAdmin: true })
      }),
    )

    await waitFor(
      () => {
        expect(screen.getByTestId('user-avatar-button')).toBeInTheDocument()
      },
      { timeout: 5000 },
    )
  })

  it('authenticated non-admin user sees user avatar', async () => {
    // Default magazine user is authenticated non-admin
    await given(magazine.full())

    await waitFor(
      () => {
        expect(screen.getByTestId('user-avatar-button')).toBeInTheDocument()
      },
      { timeout: 5000 },
    )
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
      expect(screen.getByText('Login')).toBeInTheDocument()
    })
  })

  it('DEV Login button does not appear when devLoginEnabled is false', async () => {
    suppressConsole(/Failed to fetch session/)

    await given(
      magazine.full(({ backendCfg }) => {
        backendCfg.withUser({ isAuthenticated: false })
      }),
    )

    await waitFor(() => {
      expect(screen.getByText('Login')).toBeInTheDocument()
    })
    expect(screen.queryByText('DEV Login')).not.toBeInTheDocument()
  })

  it('authenticated user can access Sign out option', async () => {
    await given(
      magazine.full(({ backendCfg }) => {
        backendCfg.withUser({ name: 'Test User' })
      }),
    )

    // Wait for user avatar to appear (CI may be slow)
    const avatar = await screen.findByTestId(
      'user-avatar-button',
      {},
      { timeout: 5000 },
    )
    // Open the user dropdown menu
    await userEvent.click(avatar)

    await waitFor(() => {
      expect(screen.getByText('Sign out')).toBeInTheDocument()
    })
  })

  it('Login modal shows DEV Quick Login when devLoginEnabled is true', async () => {
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

    const loginButton = await screen.findByText('Login')
    await userEvent.click(loginButton)

    await waitFor(() => {
      expect(screen.getByText('DEV Quick Login')).toBeInTheDocument()
    })
  })
})
