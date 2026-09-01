import type { Group, Person } from '@igstack/app-catalog-backend-core'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { AppCatalogContext } from '~/modules/appCatalog/context/AppCatalogContext'
import type { AppCatalogContextIface } from '~/modules/appCatalog/context/AppCatalogContext'
import { PersonOrGroupBadge } from '~/modules/appCatalog/ui/components/PersonBadge'

const persons: Person[] = [
  { slug: 'jdoe@example.com', firstName: 'Jane', lastName: 'Doe' },
]
const groups: Group[] = [
  { slug: 'cloud-team', displayName: 'Cloud Team', memberSlugs: [] },
]

function renderBadge(slug: string) {
  const ctx = {
    resources: [],
    isLoadingApps: false,
    tagsDefinitions: [],
    approvalMethods: [],
    persons,
    groups,
  } satisfies AppCatalogContextIface

  render(
    <AppCatalogContext value={ctx}>
      <PersonOrGroupBadge slug={slug} />
    </AppCatalogContext>,
  )
}

// An approver slug names EITHER a person or a group, and an unresolvable one
// must stay visible rather than being silently dropped.
describe('PersonOrGroupBadge — resolving an approver slug', () => {
  it('renders a person by name', () => {
    renderBadge('jdoe@example.com')
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
  })

  it('renders a group by display name', () => {
    renderBadge('cloud-team')
    expect(screen.getByText('Cloud Team')).toBeInTheDocument()
  })

  it('renders the raw slug when the slug matches neither', () => {
    renderBadge('nobody-knows-me')
    expect(screen.getByText('nobody-knows-me')).toBeInTheDocument()
  })
})
