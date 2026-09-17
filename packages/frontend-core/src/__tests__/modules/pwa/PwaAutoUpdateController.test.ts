import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PwaAutoUpdateController } from '~/modules/pwa/PwaAutoUpdateController'

function makeRegistration(hasWaiting: boolean) {
  const postMessage = vi.fn()
  const registration = {
    update: vi.fn().mockResolvedValue(undefined),
    waiting: hasWaiting ? { postMessage } : null,
  } as unknown as ServiceWorkerRegistration

  return { registration, postMessage }
}

function makeController(registration: ServiceWorkerRegistration) {
  const updateSW = vi.fn()
  const controller = new PwaAutoUpdateController(
    { updateSW, registration },
    { minCheckIntervalMs: 0 },
  )
  return { controller, updateSW }
}

describe('PwaAutoUpdateController', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it('asks a waiting worker to take over after checking for an update', async () => {
    const { registration, postMessage } = makeRegistration(true)
    const { controller } = makeController(registration)

    // @ts-expect-error -- exercising the private check the timers/visibility call
    await controller.checkForUpdate()

    expect(registration.update).toHaveBeenCalledOnce()
    expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
  })

  it('does nothing extra when no new worker is waiting', async () => {
    const { registration } = makeRegistration(false)
    const { controller } = makeController(registration)

    // @ts-expect-error -- exercising the private check the timers/visibility call
    await expect(controller.checkForUpdate()).resolves.toBeUndefined()

    expect(registration.update).toHaveBeenCalledOnce()
  })

  it('activates a waiting worker before the error-triggered reload', async () => {
    const { registration, postMessage } = makeRegistration(true)
    const { controller, updateSW } = makeController(registration)

    vi.useFakeTimers()
    const done = controller.triggerUpdateOnError()
    await vi.runAllTimersAsync()
    await done

    expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
    expect(updateSW).toHaveBeenCalledWith(true)
  })
})
