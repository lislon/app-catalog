import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { PwaAutoUpdateController } from '~/modules/pwa/PwaAutoUpdateController'
import { PwaAutoUpdateProvider } from '~/modules/pwa/PwaAutoUpdateContext'
import type { PwaUpdateHandle } from '~/modules/pwa/types'

const handle = (registration?: ServiceWorkerRegistration): PwaUpdateHandle => ({
  updateSW: vi.fn(),
  registration,
})

describe('PwaAutoUpdateProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps one controller while the registration arrives and the options are re-created', () => {
    // The host app passes a handle without a registration first, then a new
    // one once the worker registers, and an inline options object every
    // render. A rebuilt controller drops its pending visibility check.
    const start = vi.spyOn(PwaAutoUpdateController.prototype, 'start')
    const destroy = vi.spyOn(PwaAutoUpdateController.prototype, 'destroy')
    const updateHandle = vi.spyOn(
      PwaAutoUpdateController.prototype,
      'updateHandle',
    )
    const registered = handle({} as ServiceWorkerRegistration)

    const { rerender } = render(
      <PwaAutoUpdateProvider handle={handle()} options={{ debug: false }}>
        <div />
      </PwaAutoUpdateProvider>,
    )
    rerender(
      <PwaAutoUpdateProvider handle={registered} options={{ debug: false }}>
        <div />
      </PwaAutoUpdateProvider>,
    )

    expect(start).toHaveBeenCalledTimes(1)
    expect(destroy).not.toHaveBeenCalled()
    expect(updateHandle).toHaveBeenLastCalledWith(registered)
  })
})
