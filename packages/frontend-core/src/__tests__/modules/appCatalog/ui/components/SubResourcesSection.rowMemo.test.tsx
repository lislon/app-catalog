import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Resource } from '@igstack/app-catalog-backend-core'
import { ExtensionsContext } from '~/modules/extensions'
import type { AcPlugin } from '~/modules/extensions'
import { SubResourcesSection } from '~/modules/appCatalog/ui/components/SubResourcesSection'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => (
    <a href="#">{children}</a>
  ),
  useNavigate: () => vi.fn(),
  useSearch: () => ({}),
}))

vi.mock('~/modules/appCatalog/ui/components/PersonBadge', () => ({
  PersonBadge: () => null,
  PersonOrGroupBadge: () => null,
}))

const parent = { slug: 'cloud', displayName: 'Cloud' } as Resource
const children = [
  { slug: 'acct-a', displayName: 'alpha-account' },
  { slug: 'acct-b', displayName: 'alpha-backup' },
  { slug: 'acct-c', displayName: 'zeta-account' },
] as Resource[]

/**
 * Renders per row, counted through the public plugin API.
 *
 * The row-actions slot is invoked once per row render, so its call count IS the
 * row's render count — no internal instrumentation and nothing to keep in sync
 * with the component's structure.
 */
let renders: Record<string, number> = {}

const countingPlugin: AcPlugin = {
  name: 'render-counter',
  slots: {
    resourceSubResourceRowActions: ({ resource }) => {
      renders[resource.slug] = (renders[resource.slug] ?? 0) + 1
      return <span>cell</span>
    },
  },
}

function mount() {
  return render(
    <ExtensionsContext value={[countingPlugin]}>
      <SubResourcesSection
        subResources={children}
        parentSlug={parent.slug}
        parent={parent}
      />
    </ExtensionsContext>,
  )
}

const filterBox = () => screen.getByPlaceholderText(/Search resources/i)

/**
 * The rows are memoized, and on a large table that is a correctness-adjacent
 * property rather than a nicety: measured on the 667-account catalog entry, a
 * filter keystroke that changed no visible row cost ~400ms and wrote 9
 * attributes, because every row's tree was rebuilt and diffed. Memoizing the
 * row took the same keystroke to ~33ms.
 *
 * These tests pin the two things that make it work, both easy to undo by
 * accident: props must stay referentially stable across a filter change, and
 * the highlight must arrive as a boolean rather than as the slug (which would
 * change a prop on EVERY row whenever the highlight moved).
 */
describe('sub-resource rows are memoized', () => {
  beforeEach(() => {
    renders = {}
  })

  it('renders each row once on mount', () => {
    mount()

    // The baseline the next test depends on. Without it, "no re-render" could
    // pass simply because nothing ever rendered.
    expect(renders).toEqual({ 'acct-a': 1, 'acct-b': 1, 'acct-c': 1 })
  })

  it('does not re-render a row when filtering leaves it on screen', async () => {
    mount()
    expect(renders['acct-a']).toBe(1)

    // 'alpha' keeps rows a and b and drops c. The two survivors are the same
    // objects from the same array, so their props are unchanged and memo should
    // skip them entirely.
    await userEvent.type(filterBox(), 'alpha')

    expect(screen.getByText('alpha-account')).toBeInTheDocument()
    expect(screen.getByText('alpha-backup')).toBeInTheDocument()
    expect(screen.queryByText('zeta-account')).not.toBeInTheDocument()

    // Five keystrokes, five re-renders of the section. The surviving rows must
    // not have re-rendered even once.
    expect(renders['acct-a']).toBe(1)
    expect(renders['acct-b']).toBe(1)
  })

  it('re-renders a row that comes back after the filter is cleared', async () => {
    mount()
    await userEvent.type(filterBox(), 'alpha')
    expect(renders['acct-c']).toBe(1)

    await userEvent.clear(filterBox())

    expect(screen.getByText('zeta-account')).toBeInTheDocument()
    // Unmounted while filtered out, so it genuinely mounts again. This is the
    // positive control: memo must not be so sticky that a row that should
    // reappear does not.
    expect(renders['acct-c']).toBe(2)
  })
})
