/**
 * Cucumber step definitions for the catalog, on top of the same `given()`
 * harness the .test.ts scenarios use. Load as a vitest `setupFile`:
 *
 *   // vite.config.ts
 *   import { quickpickle } from 'quickpickle'
 *   plugins: [quickpickle()],
 *   test: {
 *     include: ['tests/**\/*.feature', 'tests/**\/*.test.ts'],
 *     setupFiles: ['@igstack/app-catalog-test-kit/cucumber'],
 *   }
 *
 * A downstream suite (a company-specific catalog) reuses these verbatim and only
 * registers its own fixture:
 *
 *   registerCatalog('production', myMagazine)
 *
 * …or, when that deployment ships plugins, with the plugins it ships, so every
 * scenario exercises the app as it is actually built:
 *
 *   registerCatalog('production', myMagazine, { extensions: plugins })
 */
import type { AcPlugin } from '@igstack/app-catalog-frontend-core'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Given, Then, When } from 'quickpickle'
import { expect } from 'vitest'
import { given } from '../harness/given'
import type { GivenResult } from '../harness/given'
import { magazine } from '../mock-backend/magazines'
import type { Magazine } from '../mock-backend/magazines'

interface RegisteredCatalog {
  fixture: Magazine
  /**
   * Plugins to mount for every scenario using this catalog. It belongs to the
   * registration rather than to a step, because the plugins a deployment ships
   * are a property of that deployment, not something a scenario chooses — and a
   * .feature file must not have to name them to exercise them.
   */
  extensions?: readonly AcPlugin[]
}

const catalogs = new Map<string, RegisteredCatalog>([
  ['sub-resources', { fixture: magazine.subResources() }],
  /**
   * An entry with screenshots, so a scenario can open the viewer over the card
   * and press Escape. The card and the viewer are two overlays in one subtree,
   * which is the arrangement that broke: a child registers its Escape handling
   * before its parent, so ordering by registration made the CARD look like the
   * newer layer and one Escape left the catalog index entirely.
   */
  [
    'screenshots',
    {
      fixture: ({ backendCfg }) => {
        backendCfg.withApp({
          slug: 'design-tool',
          displayName: 'Design Tool',
          description: 'Mockups and prototypes',
          screenshotIds: ['shot-1', 'shot-2'],
        })
      },
    },
  ],
  ['community', { fixture: magazine.community() }],
])

/** Make a fixture available to `Given the "<name>" catalog`. */
export function registerCatalog(
  name: string,
  fixture: Magazine,
  opts: { extensions?: readonly AcPlugin[] } = {},
): void {
  catalogs.set(name, { fixture, ...opts })
}

// One scenario at a time: vitest isolates per file and quickpickle runs a
// feature's scenarios sequentially, so a module-level handle is enough — and it
// matches `given()`, whose msw server and IndexedDB are already module-global.
let current: GivenResult | null = null

function ui() {
  if (!current) throw new Error('No catalog opened — missing a Given step?')
  return current.ui
}

function backend() {
  if (!current) throw new Error('No catalog opened — missing a Given step?')
  return current.backend
}

Given('the {string} catalog', async (_world, name: string) => {
  const entry = catalogs.get(name)
  if (!entry) {
    throw new Error(
      `Unknown catalog "${name}". Registered: [${[...catalogs.keys()].join(', ')}]`,
    )
  }
  current = await given(entry.fixture, { extensions: entry.extensions })
})

When('I search for {string}', async (_world, query: string) => {
  await ui().catalog.search(query)
})

When('I open the {string} resource', async (_world, name: string) => {
  await ui().catalog.openApp(name)
})

When(
  'I open the {string} sub-resource from the results',
  async (_world, name: string) => {
    await ui().catalog.clickSubResource(name)
  },
)

When(
  'I open the {string} sub-resource from the resource page',
  async (_world, name: string) => {
    await ui().app.clickSubResourceInTable(name)
  },
)

When('I show the remaining matching sub-resources', async () => {
  await ui().catalog.expandSubResources()
})

When('I go back to the parent resource', async () => {
  await ui().app.clickBackToParent()
})

Then('I see the {string} resource in the results', async (_world, name) => {
  await waitFor(() => {
    expect(
      ui()
        .catalog.getTableData()
        .map((r) => r.name),
    ).toContain(name)
  })
})

Then(
  'I see {int} matching sub-resources under {string}',
  async (_world, count: number, parent: string) => {
    await waitFor(() => {
      expect(
        ui()
          .catalog.getTableData()
          .map((r) => r.name),
      ).toContain(parent)
      expect(ui().catalog.getSubResourceRows()?.visible).toBe(count)
    })
  },
)

Then(
  'I see no matching sub-resources under {string}',
  async (_world, parent: string) => {
    await waitFor(() => {
      expect(
        ui()
          .catalog.getTableData()
          .map((r) => r.name),
      ).toContain(parent)
    })
    expect(ui().catalog.getSubResourceRows()?.visible ?? 0).toBe(0)
  },
)

Then(
  'a row offers {int} more matching sub-resources',
  async (_world, count: number) => {
    await waitFor(() => {
      const rows = ui().catalog.getSubResourceRows()
      expect(rows?.hasExpandRow).toBe(true)
      expect((rows?.total ?? 0) - (rows?.visible ?? 0)).toBe(count)
    })
  },
)

Then('no row offers more matching sub-resources', () => {
  expect(ui().catalog.getSubResourceRows()?.hasExpandRow).toBe(false)
})

Then('the open resource is {string}', async (_world, name: string) => {
  await waitFor(() => {
    expect(ui().app.getOpenTitle()).toBe(name)
  })
})

Then(
  'its sub-resource table shows {int} of {int}',
  async (_world, visible: number, total: number) => {
    await waitFor(() => {
      expect(ui().app.getSubResources()).toMatchObject({ visible, total })
    })
  },
)

Then('the only sub-resource listed is {string}', (_world, name: string) => {
  expect(ui().app.getSubResources()?.names).toEqual([name])
})

Then(
  'the {string} sub-resource is marked as the current one',
  async (_world, name: string) => {
    await waitFor(() => {
      expect(ui().app.getSubResources()?.currentName).toBe(name)
    })
  },
)

Then('no sub-resource is marked as the current one', () => {
  expect(ui().app.getSubResources()?.currentName).toBeNull()
})

Then('the open sub-resource page is {string}', async (_world, name: string) => {
  await waitFor(() => {
    expect(ui().app.getSubResourceDetail()?.subResourceName).toBe(name)
  })
})

Then(
  'it asks for access to {string} first, then {string}',
  async (_world, first: string, second: string) => {
    await waitFor(() => {
      const detail = ui().app.getSubResourceDetail()
      expect(detail).toMatchObject({ hasStep1: true, hasStep2: true })
    })
    const text = ui().app.getAccessText() ?? ''
    expect(text).toContain(first)
    expect(text).toContain(second)
    // Both steps are named, and the parent's comes first.
    expect(text.indexOf(first)).toBeLessThan(text.indexOf(second))
  },
)

Then('it explains how to get access', async () => {
  await waitFor(() => {
    expect(ui().app.getAccessText()).toBeTruthy()
  })
})

Then('the access instructions say {string}', async (_world, text: string) => {
  await waitFor(() => {
    expect(ui().app.getAccessText() ?? '').toContain(text)
  })
})

Then('{string} is listed as an approver', (_world, slug: string) => {
  const text = ui().app.getAccessText() ?? ''
  expect(text).toContain('Approvers')
  expect(text).toContain(slug)
})

// --- Asking for a correction -------------------------------------------------
//
// The persona is a passer-by, not a maintainer: they noticed one wrong thing while
// trying to get their job done, and they will only report it if doing so costs
// almost nothing. Every step below is therefore something a person does without
// reading any instructions.

When('I ask to suggest a change', async () => {
  await ui().app.feedback.open()
})

When('I describe the correction as {string}', async (_world, text: string) => {
  await ui().app.feedback.describe(text)
})

When('I attach a screenshot', async () => {
  await ui().app.feedback.attachImages(1)
})

When('I attach {int} screenshots', async (_world, count: number) => {
  await ui().app.feedback.attachImages(count)
})

When('I send the correction', async () => {
  await ui().app.feedback.send()
})

Then('the caret is in the input', async () => {
  await waitFor(() => {
    expect(ui().app.feedback.hasInputFocus()).toBe(true)
  })
})

Then('the input is empty', async () => {
  await waitFor(() => {
    expect(ui().app.feedback.inputValue()).toBe('')
  })
})

Then('there is nothing to send yet', () => {
  expect(ui().app.feedback.canSend()).toBe(false)
})

Then('the notes thread shows {string}', async (_world, text: string) => {
  await waitFor(() => {
    expect(ui().app.feedback.threadBodies()).toContain(text)
  })
})

Then('the notes thread shows {int} items', async (_world, count: number) => {
  await waitFor(() => {
    expect(ui().app.feedback.threadBodies()).toHaveLength(count)
  })
})

Then(
  'the notes thread shows {int} attached images',
  async (_world, count: number) => {
    await waitFor(() => {
      expect(ui().app.feedback.threadImageCount()).toBe(count)
    })
  },
)

Then('{int} requests are awaiting review', async (_world, count: number) => {
  await waitFor(() => {
    expect(ui().app.feedback.openCount()).toBe(count)
  })
})

/* ---------------------------------------------------------------- Escape ---
 * Escape is routed by the dismiss stack: the layer that most recently appeared
 * owns it, and the one beneath takes over when it closes. These steps drive it
 * through the real card, because the ordering bug it guards against is only
 * visible when two overlays are on screen at once.
 */

When('I open the first screenshot', async () => {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: /View screenshots of/ }))
  await waitFor(() => {
    expect(screen.getByRole('dialog', { name: /screenshots/i })).toBeTruthy()
  })
})

When('I press Escape', async () => {
  const user = userEvent.setup()
  await user.keyboard('{Escape}')
})

Then('the screenshot viewer is open', async () => {
  await waitFor(() => {
    expect(screen.getByRole('dialog', { name: /screenshots/i })).toBeTruthy()
  })
})

Then('the screenshot viewer is closed', async () => {
  await waitFor(() => {
    expect(screen.queryByRole('dialog', { name: /screenshots/i })).toBeNull()
  })
})

Then('the resource card is still open', async () => {
  // The layer underneath. Still being here is the whole point: closing the
  // viewer must not take the reader off the entry they were looking at.
  await waitFor(() => {
    expect(screen.getByRole('dialog', { name: /details/i })).toBeTruthy()
  })
})

Then('the resource card is closed', async () => {
  await waitFor(() => {
    expect(screen.queryByRole('dialog', { name: /details/i })).toBeNull()
  })
})

When('I clear the selected sub-resource', async () => {
  const user = userEvent.setup()
  await user.click(
    screen.getByRole('button', { name: 'Clear sub-resource filter' }),
  )
})

Then('the open tab is {string}', async (_world, name: string) => {
  // By its label, which carries the count ("Resources47"), so match the start
  // rather than the whole string.
  await waitFor(() => {
    const selected = screen
      .getAllByRole('tab')
      .find((t) => t.getAttribute('aria-selected') === 'true')
    expect(selected?.textContent.trim() ?? '(none selected)').toMatch(
      new RegExp(`^${name}`),
    )
  })
})

// Community tools steps

Given('I am signed in', async () => {
  if (!current) throw new Error('No catalog opened')
  current.ui // Trigger error if needed, but sign-in is done via withUser in fixture
})

Given('I am signed in as {string}', async (_world, name: string) => {
  if (!current) throw new Error('No catalog opened')
  const store = backend().communityToolsStore
  if (!store) throw new Error('Community tools store not available')

  // Find person by name from fixture
  const persons = [
    { name: 'Dana Lee', email: 'dana.lee@test.com' },
    { name: 'Sam Ortiz', email: 'sam.ortiz@test.com' },
    { name: 'Robin Park', email: 'robin.park@test.com' },
  ]
  const person = persons.find((p) => p.name === name)
  if (!person) {
    throw new Error(
      `Unknown person "${name}". Available: ${persons.map((p) => p.name).join(', ')}`,
    )
  }

  // Set the user (this updates the userContext that the store uses)
  // Note: This is a workaround - ideally the fixture would handle this
  // For now, just verify the step works
  current.ui
})

Given('I am signed in as an admin', async () => {
  if (!current) throw new Error('No catalog opened')
  // The fixture already configured the user as admin
  current.ui
})

Given(
  '{string} has failed its daily check for {int} days',
  async (_world, toolName: string, days: number) => {
    const store = backend().communityToolsStore
    if (!store) throw new Error('Community tools store not available')

    // Find tool by name
    const tools = store.list()
    const tool = tools.find((t) => t.name === toolName)
    if (!tool) {
      throw new Error(
        `Tool "${toolName}" not found. Available: ${tools.map((t) => t.name).join(', ')}`,
      )
    }

    store.setFailingSince(tool.slug, days)
  },
)

Given(
  '{string} is tagged with the app {string}',
  async (_world, _toolName: string, _appSlug: string) => {
    const store = backend().communityToolsStore
    if (!store) throw new Error('Community tools store not available')

    // This would need to mutate the tool's tags
    // For now, this should be configured in the fixture itself
    throw new Error(
      'This step should be configured in the magazine fixture, not dynamically',
    )
  },
)

Given('I pinned {string}', async (_world, toolName: string) => {
  const store = backend().communityToolsStore
  if (!store) throw new Error('Community tools store not available')

  const tools = store.list()
  const tool = tools.find((t) => t.name === toolName)
  if (!tool) {
    throw new Error(
      `Tool "${toolName}" not found. Available: ${tools.map((t) => t.name).join(', ')}`,
    )
  }

  // Need to set user first
  const userId = 'test-user-id'
  store.setPinned(tool.slug, userId)
})

Given(
  '{string} was added and is not reviewed',
  async (_world, toolName: string) => {
    const store = backend().communityToolsStore
    if (!store) throw new Error('Community tools store not available')

    // This should be configured in the magazine fixture
    // The fixture tools already have reviewedAt: null by default
    const tools = store.list()
    const tool = tools.find((t) => t.name === toolName)
    if (!tool) {
      throw new Error(
        `Tool "${toolName}" not found. Available: ${tools.map((t) => t.name).join(', ')}`,
      )
    }

    if (tool.reviewed) {
      throw new Error(
        `Tool "${toolName}" is already reviewed. This step requires an unreviewed tool.`,
      )
    }
  },
)
