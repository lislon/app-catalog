import { describe, expect, it, vi } from 'vitest'
import { waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import {
  given,
  magazine,
  takeUnhandledRequests,
} from '@igstack/app-catalog-test-kit'

/**
 * A green run must not print things that look like failures (#119). A downstream
 * suite ran green while printing `Error: Not implemented: window.scrollTo` on every
 * navigation and `[MSW] Unhandled: GET .../comments.list` on every opened resource,
 * so its scenarios were asserting less than their names claimed.
 */
describe('a green run is a quiet run', () => {
  it('lets router scroll restoration call window.scrollTo without a jsdom error', () => {
    // jsdom reports its not-implemented stub through a virtual console that no
    // spy on `console` sees, so the check is that the harness replaced the stub.
    expect(vi.isMockFunction(window.scrollTo)).toBe(true)
    expect(() => window.scrollTo(0, 0)).not.toThrow()
  })

  it('answers the feedback query of an opened resource instead of leaving it unhandled', async () => {
    const { ui } = await given(magazine.full(), {
      initialRoute: '/app/taskflow',
    })
    await waitFor(() => expect(ui.catalog.isDetailPanelOpen()).toBe(true))
    // The feedback list is asked for as the card opens, for the Behind this
    // card count, and an empty answer renders nothing. Sending a note and
    // seeing it listed proves the list request was answered (the refetch
    // after the send), not merely issued.
    await ui.app.feedback.open()
    await ui.app.feedback.describe('A quiet note.')
    await ui.app.feedback.send()
    await waitFor(() =>
      expect(ui.app.feedback.threadBodies()).toContain('A quiet note.'),
    )

    expect(takeUnhandledRequests()).toEqual([])
  })
})
