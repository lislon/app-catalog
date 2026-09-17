import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// The header pulls in the router, the theme switcher, an svgr asset and the
// whole auth/tRPC stack. None of that is under test here, so it is stubbed down
// to the two things these cases drive: session state and `devLoginEnabled`.
const state = vi.hoisted(() => ({
  isLoading: false,
  isAuthenticated: false,
  devLoginEnabled: false,
  user: null as { name?: string; email?: string } | null,
}))

vi.mock('~/assets/app-catalog.svg?react', () => ({
  default: () => <svg role="img" aria-label="App Catalog" />,
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...rest }: { children?: React.ReactNode }) => (
    <a {...rest}>{children}</a>
  ),
}))
vi.mock('~/components/ThemeSwitcher', () => ({
  ThemeSwitcher: () => <button type="button">Toggle theme</button>,
}))
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: { devLoginEnabled: state.devLoginEnabled } })),
}))
vi.mock('~/api/infra/trpc', () => ({
  useTRPC: vi.fn(() => ({
    auth: { getProviders: { queryOptions: () => ({}) } },
  })),
}))
vi.mock('~/modules/auth', () => ({
  useAuth: vi.fn(() => ({ isLoading: state.isLoading })),
  useIsAuthenticated: vi.fn(() => state.isAuthenticated),
  useUser: vi.fn(() => state.user),
  useAuthActions: vi.fn(() => ({ logout: vi.fn(), devLogin: vi.fn() })),
}))

const { Header } = await import('~/ui/components/header/Header')

beforeEach(() => {
  state.isLoading = false
  state.isAuthenticated = false
  state.devLoginEnabled = false
  state.user = null
})

describe('Header login affordance', () => {
  it('offers an anonymous visitor no way into the login flow', () => {
    render(<Header />)

    // Catches a plain "Login" and any other login-ish control alike.
    expect(screen.queryByRole('button', { name: /login/i })).toBeNull()
    expect(screen.queryByText('Login')).not.toBeInTheDocument()
  })

  // Deliberately kept: already gated behind `devLoginEnabled`, so it never
  // reaches a real deployment.
  it('still shows DEV Login when the backend enables it', () => {
    state.devLoginEnabled = true
    render(<Header />)

    expect(
      screen.getByRole('button', { name: 'DEV Login' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Login')).not.toBeInTheDocument()
  })

  it('leaves no empty wrapper where the button used to be', () => {
    const { container } = render(<Header />)

    // An empty flex child still eats the parent's `gap-3`, which is the
    // "no layout gap left behind" acceptance criterion.
    const empties = [...container.querySelectorAll('div')].filter(
      (el) => el.childNodes.length === 0,
    )
    expect(empties).toEqual([])
  })

  it('still shows the user menu once authenticated', () => {
    state.isAuthenticated = true
    state.user = { name: 'Igor Golovin', email: 'igolovin@natera.com' }
    render(<Header />)

    expect(screen.getByTestId('user-avatar-button')).toBeInTheDocument()
  })
})
