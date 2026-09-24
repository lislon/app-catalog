import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { UiSettingsContext } from '~/context/UiSettingsContext'
import { AppCatalogContext } from '~/modules/appCatalog/context/AppCatalogContext'
import type { AppCatalogContextIface } from '~/modules/appCatalog/context/AppCatalogContext'

// MarkdownLink asks the router for the current path; no router is mounted here.
vi.mock('@tanstack/react-router', () => ({
  useRouterState: vi.fn(() => '/'),
  Link: ({ children, ...rest }: { children?: React.ReactNode }) => (
    <a {...rest}>{children}</a>
  ),
}))

const { MarkdownText } =
  await import('~/modules/appCatalog/ui/components/MarkdownText')

const TEMPLATE = 'https://chat.example.com/channels/{name}'

const ctx = {
  resources: [],
  isLoadingApps: false,
  tagsDefinitions: [],
  approvalMethods: [],
  persons: [],
  groups: [],
} satisfies AppCatalogContextIface

// `null` = no template configured (an explicit `undefined` would hit the default).
function renderMarkdown(text: string, template: string | null = TEMPLATE) {
  return render(
    <UiSettingsContext
      value={{ chatChannelUrlTemplate: template ?? undefined }}
    >
      <AppCatalogContext value={ctx}>
        <MarkdownText>{text}</MarkdownText>
      </AppCatalogContext>
    </UiSettingsContext>,
  )
}

// A bare channel mention such as "Slack #swaggerhub" used to render as plain
// text, so the reader had to search the workspace by hand.
describe('MarkdownText — chat channel mentions', () => {
  it('turns a #channel mention into a new-tab link built from the template', () => {
    renderMarkdown('For questions, ask in Slack #swaggerhub channel.')

    const link = screen.getByRole('link', { name: '#swaggerhub' })
    expect(link).toHaveAttribute(
      'href',
      'https://chat.example.com/channels/swaggerhub',
    )
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
    expect(screen.getByText(/For questions, ask in Slack/)).toBeInTheDocument()
  })

  it('accepts underscores, dots and digits inside a name', () => {
    renderMarkdown('Ask #sage_mcp or #eng-ux-billing-bsp or #team.v2')

    expect(screen.getByRole('link', { name: '#sage_mcp' })).toHaveAttribute(
      'href',
      'https://chat.example.com/channels/sage_mcp',
    )
    expect(
      screen.getByRole('link', { name: '#eng-ux-billing-bsp' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '#team.v2' })).toHaveAttribute(
      'href',
      'https://chat.example.com/channels/team.v2',
    )
  })

  it('leaves the trailing sentence punctuation outside the link', () => {
    renderMarkdown('Join #env-hopper.')

    expect(screen.getByRole('link', { name: '#env-hopper' })).toHaveAttribute(
      'href',
      'https://chat.example.com/channels/env-hopper',
    )
  })

  it('does not link digits-only mentions such as issue numbers', () => {
    renderMarkdown('Fixed in #123 last week')

    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('Fixed in #123 last week')).toBeInTheDocument()
  })

  it('does not link a # glued to the preceding word (URL fragments)', () => {
    renderMarkdown('open sheet?gid=0#gid=0 and reload')

    expect(screen.queryByRole('link')).toBeNull()
  })

  it('does not link mentions that continue into upper-case letters', () => {
    renderMarkdown('see #fooBar for details')

    expect(screen.queryByRole('link')).toBeNull()
  })

  it('leaves inline code untouched', () => {
    renderMarkdown('run `#not-a-link` here')

    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('#not-a-link').tagName).toBe('CODE')
  })

  it('leaves existing markdown links and their fragments untouched', () => {
    renderMarkdown('[x](https://a/b#frag) and #real')

    expect(screen.getByRole('link', { name: 'x' })).toHaveAttribute(
      'href',
      'https://a/b#frag',
    )
    expect(screen.getByRole('link', { name: '#real' })).toHaveAttribute(
      'href',
      'https://chat.example.com/channels/real',
    )
  })

  it('renders plain text when no template is configured', () => {
    renderMarkdown('ask in Slack #swaggerhub channel', null)

    expect(screen.queryByRole('link')).toBeNull()
    expect(
      screen.getByText('ask in Slack #swaggerhub channel'),
    ).toBeInTheDocument()
  })
})

describe('MarkdownText — wrapper element', () => {
  it('adds a wrapper only when a className is given', () => {
    const { container: bare } = renderMarkdown('hello')
    expect(bare.firstElementChild?.tagName).toBe('P')

    const { container: wrapped } = render(
      <AppCatalogContext value={ctx}>
        <MarkdownText className="prose">hello</MarkdownText>
      </AppCatalogContext>,
    )
    expect(wrapped.firstElementChild?.tagName).toBe('SPAN')
    expect(wrapped.firstElementChild).toHaveClass('prose')
  })
})
