import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import type { AcPlugin } from '~/modules/extensions'
import { ExtensionsContext } from '~/modules/extensions'
import { KnowMoreInput } from '~/modules/appCatalog/ui/detail/KnowMoreInput'

// Stub the query layer so the component mounts.
vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
  })),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
}))
vi.mock('~/api/infra/trpc', () => ({
  useTRPC: vi.fn(() => ({
    feedback: {
      add: { mutationOptions: (o: unknown) => o },
      list: { queryKey: () => ['feedback', 'list'] },
    },
  })),
}))

function mount(plugins: AcPlugin[] | undefined) {
  return render(
    <ExtensionsContext value={plugins}>
      <KnowMoreInput appSlug="test-app" appName="Test App" />
    </ExtensionsContext>,
  )
}

describe('KnowMoreInput — feedback note slot', () => {
  it('renders the default note when no plugin is registered', () => {
    mount(undefined)
    expect(
      screen.getByText('A maintainer reads every note and updates the card.'),
    ).toBeInTheDocument()
  })

  it('renders a plugin note instead of the default', () => {
    const plugin: AcPlugin = {
      name: 'test-note',
      slots: {
        resourceDetailFeedbackNote: ({ appSlug, appName }) => (
          <>
            Custom note for {appName} ({appSlug})
          </>
        ),
      },
    }
    mount([plugin])
    expect(
      screen.getByText(/Custom note for Test App \(test-app\)/),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('A maintainer reads every note and updates the card.'),
    ).not.toBeInTheDocument()
  })

  it('passes appSlug and appName to the plugin', () => {
    let receivedProps: { appSlug: string; appName: string } | null = null
    const plugin: AcPlugin = {
      name: 'props-check',
      slots: {
        resourceDetailFeedbackNote: (props) => {
          receivedProps = props
          return <>Received</>
        },
      },
    }
    mount([plugin])
    expect(receivedProps).toEqual({
      appSlug: 'test-app',
      appName: 'Test App',
    })
  })
})
