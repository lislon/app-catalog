import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'

import { given, magazine } from '@igstack/app-catalog-test-kit'

// #9, #273: /service-desks searches every type:'service' approval method — its
// key, name, description, forms and the forms' dropdown options. magazine.full()
// seeds Support Portal (key HELP, two forms) and Ops Portal (no portal), plus two
// custom methods that must never appear.

const search = () => screen.getByLabelText('Search service desks')
const results = () => screen.queryAllByTestId('service-desk-result')
const linkDesks = () =>
  screen.queryAllByTestId('service-desk-name').map((n) => n.textContent.trim())
const formTitles = () =>
  results().map((r) => within(r).getByRole('heading').textContent)

describe('Service Desks view', () => {
  it('lists every form by area, then the desks that offer none, before a search', async () => {
    await given(magazine.full(), { initialRoute: '/service-desks' })

    // Flat: Support Portal's two forms sit in its area, IT. Ops Portal has no
    // portal, so it is a plain link in the last section.
    await waitFor(() =>
      expect(formTitles()).toEqual(['Database access', 'New laptop']),
    )
    expect(linkDesks()).toEqual(['Ops Portal'])
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent),
    ).toEqual(['IT', 'Other ways to ask'])
  })

  it('gives each form card its own address, so Back closes it', async () => {
    const user = userEvent.setup()
    const { router } = await given(magazine.full(), {
      initialRoute: '/service-desks',
    })
    await user.type(
      await screen.findByLabelText('Search service desks'),
      'orders',
    )
    await waitFor(() => expect(results()).toHaveLength(1))

    await user.click(within(results()[0]!).getByRole('heading'))

    await screen.findByRole('dialog')
    expect(router.state.location.pathname).toBe('/service-desks/help-11')
    router.history.back()
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    expect(router.state.location.pathname).toBe('/service-desks')
  })

  it('opens a form card straight from its address', async () => {
    await given(magazine.full(), { initialRoute: '/service-desks/help-11' })

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Database access')
  })

  it('moves an old ?desk=&form= link to the form card address', async () => {
    const { router } = await given(magazine.full(), {
      initialRoute: '/service-desks?desk=it-support&form=11',
    })

    await screen.findByRole('dialog')
    expect(router.state.location.pathname).toBe('/service-desks/help-11')
  })

  it('finds a form by a dropdown option and marks the option', async () => {
    const user = userEvent.setup()
    await given(magazine.full(), { initialRoute: '/service-desks' })

    await user.type(
      await screen.findByLabelText('Search service desks'),
      'orders',
    )

    await waitFor(() => expect(results()).toHaveLength(1))
    const card = results()[0]!
    expect(card).toHaveTextContent('Database access')
    expect(card).toHaveTextContent('HELP · Support Portal')
    expect(within(card).getByText('Orders DB').tagName).toBe('MARK')
    // the dead-end option is never listed
    expect(card).not.toHaveTextContent('Legacy DB')
    expect(within(card).getByRole('link')).toHaveAttribute(
      'href',
      'https://support.example.com/create/11',
    )
  })

  it('returns every form of a desk searched by its key', async () => {
    const user = userEvent.setup()
    await given(magazine.full(), { initialRoute: '/service-desks' })

    await user.type(
      await screen.findByLabelText('Search service desks'),
      'help',
    )

    await waitFor(() =>
      expect(
        results().map((r) => within(r).getByRole('heading').textContent),
      ).toEqual(['Database access', 'New laptop']),
    )
  })

  it('reads a query typed on the Cyrillic keyboard layout', async () => {
    const user = userEvent.setup()
    await given(magazine.full(), { initialRoute: '/service-desks' })

    // "щквукы" is "orders" typed with the layout left on Cyrillic
    await user.type(
      await screen.findByLabelText('Search service desks'),
      'щквукы',
    )

    await waitFor(() => expect(results()).toHaveLength(1))
    expect(screen.getByText(/Showing results for/)).toHaveTextContent('orders')
  })

  it('opens the details card from a result, on the form that was clicked', async () => {
    const user = userEvent.setup()
    await given(magazine.full(), { initialRoute: '/service-desks' })
    await user.type(
      await screen.findByLabelText('Search service desks'),
      'orders',
    )
    await waitFor(() => expect(results()).toHaveLength(1))

    await user.click(within(results()[0]!).getByRole('heading'))

    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByRole('tab', { name: 'Overview' }),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole('tab', { name: 'Behind this card' }),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole('link', { name: /Open the form/ }),
    ).toHaveAttribute('href', 'https://support.example.com/create/11')
    expect(dialog).toHaveTextContent('You will be asked for')
    expect(dialog).toHaveTextContent('One or more of: Orders DB, Billing DB')
    expect(dialog).toHaveTextContent('A person, picked from the directory')
    expect(dialog).toHaveTextContent(
      'Access is granted within 2 business days.',
    )
  })

  it('clears the search with the clear button and with Escape', async () => {
    const user = userEvent.setup()
    await given(magazine.full(), { initialRoute: '/service-desks' })
    await user.type(
      await screen.findByLabelText('Search service desks'),
      'orders',
    )

    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(search()).toHaveValue('')
    expect(search()).toHaveFocus()

    await user.type(search(), 'laptop')
    await user.keyboard('{Escape}')
    expect(search()).toHaveValue('')
  })

  it('toggles between Catalog and Service Desks from the header', async () => {
    const { router } = await given(magazine.full(), { initialRoute: '/' })

    await waitFor(() =>
      expect(screen.getByLabelText('Search apps')).toBeInTheDocument(),
    )

    const user = userEvent.setup()
    await user.click(screen.getByRole('link', { name: /^Service Desks/ }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/service-desks')
    })
    expect(search()).toBeInTheDocument()
  })

  it('autofocuses the search input when the view loads (parity with Catalog)', async () => {
    await given(magazine.full(), { initialRoute: '/service-desks' })

    const input = await screen.findByLabelText('Search service desks')
    await waitFor(() => expect(input).toHaveFocus())
  })
})

// #23: the header "Catalog" tab must stay active while viewing an app-detail route
// (/app/<slug>) — the detail panel is part of the Catalog view.
describe('Section tab active state (#23)', () => {
  const catalogTab = () => screen.getByRole('link', { name: /^Catalog/ })
  const deskTab = () => screen.getByRole('link', { name: /^Service Desks/ })

  it('activates the Catalog tab on an app-detail route (/app/$slug)', async () => {
    await given(magazine.full(), { initialRoute: '/app/taskflow' })

    await waitFor(() =>
      expect(catalogTab()).toHaveAttribute('aria-current', 'page'),
    )
    expect(deskTab()).not.toHaveAttribute('aria-current')
  })

  it('activates the Catalog tab on the root route', async () => {
    await given(magazine.full(), { initialRoute: '/' })

    await waitFor(() =>
      expect(catalogTab()).toHaveAttribute('aria-current', 'page'),
    )
    expect(deskTab()).not.toHaveAttribute('aria-current')
  })

  it('activates only Service Desks on the /service-desks route', async () => {
    await given(magazine.full(), { initialRoute: '/service-desks' })

    await waitFor(() =>
      expect(deskTab()).toHaveAttribute('aria-current', 'page'),
    )
    expect(catalogTab()).not.toHaveAttribute('aria-current')
  })
})
