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
 */
import { waitFor } from '@testing-library/react'
import { Given, Then, When } from 'quickpickle'
import { expect } from 'vitest'
import { given } from '../harness/given'
import type { GivenResult } from '../harness/given'
import { magazine } from '../mock-backend/magazines'
import type { Magazine } from '../mock-backend/magazines'

const catalogs = new Map<string, Magazine>([
  ['sub-resources', magazine.subResources()],
])

/** Make a fixture available to `Given the "<name>" catalog`. */
export function registerCatalog(name: string, fixture: Magazine): void {
  catalogs.set(name, fixture)
}

// One scenario at a time: vitest isolates per file and quickpickle runs a
// feature's scenarios sequentially, so a module-level handle is enough — and it
// matches `given()`, whose msw server and IndexedDB are already module-global.
let current: GivenResult | null = null

function ui() {
  if (!current) throw new Error('No catalog opened — missing a Given step?')
  return current.ui
}

Given('the {string} catalog', async (_world, name: string) => {
  const fixture = catalogs.get(name)
  if (!fixture) {
    throw new Error(
      `Unknown catalog "${name}". Registered: [${[...catalogs.keys()].join(', ')}]`,
    )
  }
  current = await given(fixture)
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

Then('{string} is listed as an approver', (_world, slug: string) => {
  const text = ui().app.getAccessText() ?? ''
  expect(text).toContain('Approvers')
  expect(text).toContain(slug)
})
