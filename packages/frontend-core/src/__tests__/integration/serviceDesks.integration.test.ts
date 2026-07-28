import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'

import { given } from './harness/given'
import { magazine } from './mock-backend/magazines'

// #9: a header toggle (Apps | Service Desks) + a /service-desks route showing a
// searchable table of all type:'service' approval methods with open links.
// magazine.full() seeds two service desks (IT Help Desk, UX App Helpdesk) and
// two custom methods (Manager Approval, Self-Service) which must NOT appear.

function serviceDeskTable(): HTMLElement {
  // The service-desks table (only table on that route).
  return screen.getByRole('table')
}

function deskNames(): string[] {
  const rows = within(serviceDeskTable()).getAllByRole('row')
  return rows
    .map((r) => within(r).queryAllByRole('cell')[0]?.textContent.trim() ?? '')
    .filter(Boolean)
}

describe('Service Desks view (#9)', () => {
  it('lists only service-type approval methods with open links', async () => {
    await given(magazine.full(), {
      initialRoute: '/service-desks',
    })

    await waitFor(() => {
      expect(screen.getByLabelText('Search service desks')).toBeInTheDocument()
    })

    const names = deskNames()
    expect(names).toContain('IT Help Desk')
    expect(names).toContain('UX App Helpdesk')
    // custom-type methods are not service desks
    expect(names).not.toContain('Manager Approval')
    expect(names).not.toContain('Self-Service')

    // Each service desk row has a link to its portal opening in a new tab.
    const itRow = within(serviceDeskTable())
      .getAllByRole('row')
      .find((r) => r.textContent.includes('IT Help Desk'))!
    const link = within(itRow).getByRole('link')
    expect(link).toHaveAttribute('href', 'https://helpdesk.example.com')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('filters the desks by search', async () => {
    const user = userEvent.setup()
    await given(magazine.full(), {
      initialRoute: '/service-desks',
    })

    await waitFor(() => expect(deskNames()).toContain('UX App Helpdesk'))

    await user.type(screen.getByLabelText('Search service desks'), 'UX')

    await waitFor(() => {
      const names = deskNames()
      expect(names).toContain('UX App Helpdesk')
      expect(names).not.toContain('IT Help Desk')
    })
  })

  it('toggles between Apps and Service Desks from the header', async () => {
    const { router } = await given(magazine.full(), { initialRoute: '/' })

    // Apps view first — the catalog search box is present.
    await waitFor(() =>
      expect(screen.getByLabelText('Search apps')).toBeInTheDocument(),
    )

    const user = userEvent.setup()
    await user.click(screen.getByRole('link', { name: 'Service Desks' }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/service-desks')
    })
    expect(screen.getByLabelText('Search service desks')).toBeInTheDocument()
  })
})
