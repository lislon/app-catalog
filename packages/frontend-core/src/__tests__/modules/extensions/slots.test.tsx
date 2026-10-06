import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { Resource } from '@igstack/app-catalog-backend-core'
import {
  ExtensionsContext,
  ResourceDetailAccessActions,
  ResourceDetailProvider,
} from '~/modules/extensions'
import type { AcPlugin } from '~/modules/extensions'

const resource = { slug: 'tracker', displayName: 'Tracker' } as Resource
const ctx = { resource, subResources: [], user: null }

function mount(plugins: AcPlugin[] | undefined, children: ReactNode) {
  return render(
    <ExtensionsContext value={plugins}>{children}</ExtensionsContext>,
  )
}

describe('leaf slot', () => {
  it('renders nothing when no plugin is registered', () => {
    // The open-source default. Slots are additive: with none registered the
    // output must be indistinguishable from having no slot at all.
    const { container } = mount(
      undefined,
      <ResourceDetailAccessActions {...ctx} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders every contributor, in array order', () => {
    const plugins: AcPlugin[] = [
      {
        name: 'first',
        slots: { resourceDetailAccessActions: () => <b>one</b> },
      },
      {
        name: 'second',
        slots: { resourceDetailAccessActions: () => <b>two</b> },
      },
    ]
    mount(plugins, <ResourceDetailAccessActions {...ctx} />)
    // Both render — the case a keyed map could not express, since the second
    // registration would have overwritten the first.
    expect(screen.getAllByText(/one|two/).map((n) => n.textContent)).toEqual([
      'one',
      'two',
    ])
  })

  it('hands the payload to the handler', () => {
    const seen = vi.fn()
    mount(
      [
        {
          name: 'spy',
          slots: {
            resourceDetailAccessActions: (props) => {
              seen(props.resource.slug)
              return null
            },
          },
        },
      ],
      <ResourceDetailAccessActions {...ctx} />,
    )
    expect(seen).toHaveBeenCalledWith('tracker')
  })

  it('contains a crashing plugin and reports it', () => {
    // A crash must not reach the host, and must not be silent either: with a
    // null fallback and no report it is indistinguishable from "not registered".
    const onError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const plugins: AcPlugin[] = [
      {
        name: 'boom',
        slots: {
          resourceDetailAccessActions: () => {
            throw new Error('plugin exploded')
          },
        },
      },
      {
        name: 'ok',
        slots: { resourceDetailAccessActions: () => <b>survivor</b> },
      },
    ]
    mount(plugins, <ResourceDetailAccessActions {...ctx} />)

    expect(screen.getByText('survivor')).toBeInTheDocument()
    expect(
      onError.mock.calls.some((call) =>
        call.some(
          (arg) => typeof arg === 'string' && arg.includes('[plugin:boom]'),
        ),
      ),
    ).toBe(true)
    onError.mockRestore()
  })
})

describe('wrapper slot', () => {
  it('passes children through untouched when no plugin is registered', () => {
    mount(
      undefined,
      <ResourceDetailProvider resource={resource}>
        <b>core content</b>
      </ResourceDetailProvider>,
    )
    expect(screen.getByText('core content')).toBeInTheDocument()
  })

  it('nests wrappers with the first plugin outermost', () => {
    const plugins: AcPlugin[] = [
      {
        name: 'outer',
        wrappers: {
          resourceDetailProvider: ({ children }) => (
            <div data-testid="outer">{children}</div>
          ),
        },
      },
      {
        name: 'inner',
        wrappers: {
          resourceDetailProvider: ({ children }) => (
            <div data-testid="inner">{children}</div>
          ),
        },
      },
    ]
    mount(
      plugins,
      <ResourceDetailProvider resource={resource}>
        <b>leaf</b>
      </ResourceDetailProvider>,
    )
    // Array order reads as nesting order: first declared ends up outermost.
    expect(
      screen.getByTestId('outer').querySelector('[data-testid="inner"]'),
    ).not.toBeNull()
  })

  it('keeps core content when a wrapper crashes', () => {
    // The fallback difference that matters: a leaf disappears, but a wrapper
    // only decorated the subtree, so the subtree must survive its failure.
    const onError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mount(
      [
        {
          name: 'broken-wrapper',
          wrappers: {
            resourceDetailProvider: () => {
              throw new Error('wrapper exploded')
            },
          },
        },
      ],
      <ResourceDetailProvider resource={resource}>
        <b>core content</b>
      </ResourceDetailProvider>,
    )
    expect(screen.getByText('core content')).toBeInTheDocument()
    onError.mockRestore()
  })
})
