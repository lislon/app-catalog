import type { Resource } from '@igstack/app-catalog-backend-core'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { SubResourceDetailPanel } from '~/modules/appCatalog/ui/components/SubResourceDetailPanel'

function resource(slug: string, appUrl?: string): Resource {
  return {
    id: slug,
    slug,
    displayName: slug,
    appUrl,
  } as Resource
}

const parent = resource('cloud-console', 'https://console.example')

function renderPanel(subResource: Resource) {
  return render(
    <SubResourceDetailPanel
      subResource={subResource}
      parent={parent}
      approvalMethods={[]}
      onBack={vi.fn()}
    />,
  )
}

// The panel is where a row's name click lands, so a sub-resource carrying its
// own launch URL has to be launchable from here -- not only from the parent
// table's account-id cell.
describe('SubResourceDetailPanel -- launch affordance', () => {
  it("links to the sub-resource's own appUrl, in a new tab", () => {
    const url = 'https://portal.example/#/console?account_id=111122223333'
    renderPanel(resource('acct-a', url))

    const link = screen.getByRole('link', { name: /open acct-a/i })
    expect(link).toHaveAttribute('href', url)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  // WCAG 2.5.3: the accessible name must contain the words a sighted user
  // sees, or voice control ("click Open portal.example") cannot reach the link.
  it('keeps the visible text inside the accessible name', () => {
    renderPanel(resource('acct-a', 'https://portal.example/#/console'))
    const link = screen.getByRole('link', { name: /open/i })
    const visible = link.textContent
    expect(visible).toContain('portal.example/#/console')
    for (const word of visible.trim().split(/\s+/)) {
      expect(link.getAttribute('aria-label')).toContain(word)
    }
  })

  it('exposes the full destination on hover, which truncation hides', () => {
    const url = 'https://portal.example/#/console?account_id=111122223333'
    renderPanel(resource('acct-a', url))
    expect(screen.getByRole('link', { name: /open/i })).toHaveAttribute(
      'title',
      expect.stringContaining(
        'portal.example/#/console?account_id=111122223333',
      ),
    )
  })

  it("does not fall back to the parent's URL when the sub-resource has none", () => {
    renderPanel(resource('acct-b'))

    expect(screen.queryByRole('link', { name: /open/i })).toBeNull()
    expect(screen.queryByText(parent.appUrl!)).toBeNull()
  })
})
