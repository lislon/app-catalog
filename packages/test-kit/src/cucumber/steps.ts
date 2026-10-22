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
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Given, Then, When } from 'quickpickle'
import type { DataTable } from 'quickpickle'
import { afterEach, expect, vi } from 'vitest'
import type { MockInstance } from 'vitest'
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
/** The catalog the scenario opened, and the server state its later Givens added. */
let scenario: { entry: RegisteredCatalog; extras: Magazine[] } | null = null

function ui() {
  if (!current) throw new Error('No catalog opened — missing a Given step?')
  return current.ui
}

async function boot(initialRoute?: string): Promise<void> {
  if (!scenario) throw new Error('No catalog opened — missing a Given step?')
  const { entry, extras } = scenario
  current = await given(
    (ctx) => {
      entry.fixture(ctx)
      for (const extra of extras) extra(ctx)
    },
    { extensions: entry.extensions, initialRoute },
  )
}

/**
 * Changes what the server holds, then reloads the page where it is.
 *
 * The app reads the session once on mount and caches what it fetched, so state
 * changed under a running page would never show. A reload is what a person sees
 * too: they sign in, or a colleague pins something, and the next load has it.
 */
async function givenOnServer(extra: Magazine): Promise<void> {
  if (!scenario) throw new Error('No catalog opened — missing a Given step?')
  scenario.extras.push(extra)
  await boot(current?.router.state.location.href)
}

Given('the {string} catalog', async (_world, name: string) => {
  const entry = catalogs.get(name)
  if (!entry) {
    throw new Error(
      `Unknown catalog "${name}". Registered: [${[...catalogs.keys()].join(', ')}]`,
    )
  }
  scenario = { entry, extras: [] }
  await boot()
})

When('I search for {string}', async (_world, query: string) => {
  // Each section has its own search box; type into the one on screen.
  const community = screen.queryByLabelText('Search community tools')
  if (community) {
    const user = userEvent.setup()
    await user.clear(community)
    await user.type(community, query)
    return
  }
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

/* ---------------------------------------------------------- Section tabs ---
 * Each tab is a link whose name is its title followed by its caption, so the
 * steps find a tab by the title it starts with.
 */

function sectionTabs(): HTMLElement[] {
  return within(screen.getByTestId('section-tabs')).getAllByRole('link')
}

function sectionTab(title: string): HTMLElement {
  const tab = sectionTabs().find((t) => t.textContent.startsWith(title))
  if (!tab) throw new Error(`No "${title}" section tab`)
  return tab
}

Then('the section tabs read:', async (_world, table: DataTable) => {
  await waitFor(() => {
    expect(
      sectionTabs().map((tab) =>
        [...tab.children].map((line) => line.textContent),
      ),
    ).toEqual(table.raw())
  })
})

When('I open the {string} section', async (_world, title: string) => {
  const user = userEvent.setup()
  await user.click(await waitFor(() => sectionTab(title)))
})

Then('the current section is {string}', async (_world, title: string) => {
  // Every section renders its own layout, so look the tabs up afresh each try.
  await waitFor(() => {
    const marked = sectionTabs().filter(
      (tab) => tab.getAttribute('aria-current') === 'page',
    )
    expect(marked.map((tab) => tab.textContent)).toEqual([
      sectionTab(title).textContent,
    ])
  })
})

Then('no section tab is {string}', (_world, title: string) => {
  expect(sectionTabs().map((tab) => tab.textContent)).not.toContainEqual(
    expect.stringMatching(new RegExp(`^${title}`)),
  )
})

Then('the header actions are {string}', async (_world, names: string) => {
  // Everything right of the section tabs, in order: MCP's row.
  await waitFor(() => {
    const row = screen.getByRole('link', { name: 'MCP' }).parentElement
    if (!row) throw new Error('MCP has no row')
    expect(
      [...row.querySelectorAll('a, button')].map((el) => el.textContent.trim()),
    ).toEqual(names.split(', '))
  })
})

// Community tools: server state a scenario starts from

Given('community tools are turned off', async () => {
  await givenOnServer(({ backendCfg }) => backendCfg.communityTools.disable())
})

Given('I am signed in', async () => {
  await givenOnServer(({ backendCfg }) =>
    backendCfg.withUser({ isAuthenticated: true }),
  )
})

Given('I am signed in as {string}', async (_world, name: string) => {
  await givenOnServer(({ backendCfg }) => {
    const person = backendCfg.db.persons.find(
      (p) => `${p.firstName} ${p.lastName}` === name,
    )
    if (!person) {
      throw new Error(
        `No person "${name}" in the directory. Available: ${backendCfg.db.persons.map((p) => `${p.firstName} ${p.lastName}`).join(', ')}`,
      )
    }
    backendCfg.withUser({
      name,
      email: person.email ?? person.slug,
      isAuthenticated: true,
      isAdmin: false,
    })
  })
})

Given('I am signed in as an admin', async () => {
  await givenOnServer(({ backendCfg }) =>
    backendCfg.withUser({ isAuthenticated: true, isAdmin: true }),
  )
})

Given(
  '{string} has failed its daily check for {int} days',
  async (_world, tool: string, days: number) => {
    await givenOnServer(({ backendCfg }) => {
      const tools = backendCfg.communityTools
      tools.failDailyChecks(tools.slugOf(tool), days)
    })
  },
)

Given(
  '{string} is tagged with the app {string}',
  async (_world, tool: string, app: string) => {
    await givenOnServer(({ backendCfg }) => {
      const resource = backendCfg.db.resources.find(
        (r) => r.displayName === app,
      )
      if (!resource) throw new Error(`No app "${app}" in the catalog`)
      const tools = backendCfg.communityTools
      tools.tagWithApp(tools.slugOf(tool), resource.slug)
    })
  },
)

Given('I pinned {string}', async (_world, tool: string) => {
  await givenOnServer(({ backendCfg }) => {
    const tools = backendCfg.communityTools
    tools.seedPin(tools.slugOf(tool))
  })
})

Given(
  '{string} was added and is not reviewed',
  async (_world, tool: string) => {
    await givenOnServer(({ backendCfg }) => {
      const tools = backendCfg.communityTools
      tools.seedUnreviewed({
        name: tool,
        url:
          tools.pageTitled(tool) ??
          `https://${tool.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pages.example.com/`,
      })
    })
  },
)

/* ------------------------------------------------------- Community tools ---
 * The page as a visitor sees it: one search box, their pinned shelf and
 * recents, the ranked feed or, while they type, the results that replace it.
 */

function communityList(testId: 'community-feed' | 'community-results') {
  return within(screen.getByTestId(testId)).queryAllByTestId('feed-row')
}

function rowName(row: HTMLElement): string {
  return within(row).getByTestId('feed-row-name').textContent.trim()
}

function rowNamed(
  testId: 'community-feed' | 'community-results',
  name: string,
): HTMLElement {
  const row = communityList(testId).find((r) => rowName(r) === name)
  if (!row) throw new Error(`No "${name}" row in ${testId}`)
  return row
}

function highlighted(el: HTMLElement): string[] {
  return [...el.querySelectorAll('.bg-highlight')].map((m) =>
    m.textContent.toLowerCase(),
  )
}

/** The tools a visitor could see in the feed: every one not archived. */
function liveToolNames(): string[] {
  if (!current) throw new Error('No catalog opened — missing a Given step?')
  return current.backend.communityTools
    .list()
    .filter((t) => t.lifecycle.state !== 'archived')
    .map((t) => t.name)
}

function namesTagged(word: string): string[] {
  if (!current) throw new Error('No catalog opened — missing a Given step?')
  return current.backend.communityTools
    .list()
    .filter((t) => t.tags.some((g) => g.value === word))
    .map((t) => t.name)
}

Given('I opened {string} before', async (_world, tool: string) => {
  await givenOnServer(({ backendCfg }) => {
    const tools = backendCfg.communityTools
    tools.recordView({ slug: tools.slugOf(tool) })
  })
})

const HOUR_MS = 60 * 60 * 1000

/** A view at a time before now on the real clock, which the page measures against. */
function openedEarlier(tool: string, msAgo: number): Promise<void> {
  // Fixed at the Given, so every reload replays the same instant.
  const at = new Date(Date.now() - msAgo)
  return givenOnServer(({ backendCfg }) => {
    const tools = backendCfg.communityTools
    tools.seedOpened(tools.slugOf(tool), at)
  })
}

Given(
  'I opened {string} {int} hour(s) ago',
  async (_world, tool: string, hours: number) => {
    await openedEarlier(tool, hours * HOUR_MS)
  },
)

Given(
  'I opened {string} {int} day(s) ago',
  async (_world, tool: string, days: number) => {
    await openedEarlier(tool, days * 24 * HOUR_MS)
  },
)

Given('I opened {int} different tools', async (_world, count: number) => {
  const now = Date.now()
  await givenOnServer(({ backendCfg }) => {
    const tools = backendCfg.communityTools
    for (let i = 1; i <= count; i++) {
      const slug = tools.seed({
        name: `Opened Tool ${i}`,
        url: `https://opened-tool-${i}.pages.example.com/`,
      })
      // Tool 1 the longest ago, the last one most recently.
      tools.seedOpened(slug, new Date(now - (count - i + 1) * 60_000))
    }
  })
})

async function openCommunity(): Promise<void> {
  const user = userEvent.setup()
  await user.click(await waitFor(() => sectionTab('Community tools')))
  await waitFor(() => {
    expect(screen.getByLabelText('Search community tools')).toBeTruthy()
  })
}

When('I open Community tools', openCommunity)

Then('the caret is in the search', async () => {
  await waitFor(() => {
    expect(document.activeElement).toBe(
      screen.getByLabelText('Search community tools'),
    )
  })
})

// The tab the page asked for. Restored after every scenario, so no later test
// inherits a window.open that does nothing.
let openSpy: MockInstance<typeof window.open> | null = null
afterEach(() => {
  openSpy?.mockRestore()
  openSpy = null
})

When('I press Enter', async () => {
  openSpy ??= vi.spyOn(window, 'open').mockImplementation(() => null)
  openSpy.mockClear()
  const user = userEvent.setup()
  await user.keyboard('{Enter}')
})

Then('{string} opens in a new tab', (_world, url: string) => {
  expect(openSpy).toHaveBeenCalledWith(
    url,
    '_blank',
    expect.stringContaining('noopener'),
  )
})

Then('the first result is {string}', async (_world, name: string) => {
  await waitFor(() => {
    const first = communityList('community-results')[0]
    expect(first && rowName(first)).toBe(name)
  })
})

Then('it is the selected result', () => {
  const grid = screen.getByRole('grid', { name: 'Search results' })
  const selected = within(grid).getByRole('gridcell', { selected: true })
  expect(selected.closest('[data-testid="feed-row"]')).toBe(
    communityList('community-results')[0],
  )
  expect(grid.getAttribute('aria-activedescendant')).toBe(selected.id)
  expect(
    screen
      .getByLabelText('Search community tools')
      .getAttribute('aria-activedescendant'),
  ).toBe(selected.id)
})

Then('{string} is highlighted in its owner', (_world, word: string) => {
  const first = communityList('community-results')[0]!
  expect(highlighted(within(first).getByTestId('feed-row-owner'))).toContain(
    word.toLowerCase(),
  )
})

Then('{string} is highlighted in its name', (_world, word: string) => {
  const first = communityList('community-results')[0]!
  expect(highlighted(within(first).getByTestId('feed-row-name'))).toContain(
    word.toLowerCase(),
  )
})

Then('the result says it matched the address', () => {
  const first = communityList('community-results')[0]!
  expect(within(first).getByTestId('match-reason').textContent).toContain(
    'address',
  )
})

Then('I see that nothing is listed yet', async () => {
  await waitFor(() => {
    expect(screen.getByTestId('no-results').textContent).toContain(
      'Nothing matches',
    )
  })
})

Then('My tools shows {string}', async (_world, name: string) => {
  await waitFor(() => {
    expect(
      within(screen.getByTestId('my-tools'))
        .queryAllByTestId('shelf-tile-name')
        .map((n) => n.textContent),
    ).toContain(name)
  })
})

Then('My tools says {string}', async (_world, text: string) => {
  await waitFor(() => {
    expect(
      within(screen.getByTestId('my-tools')).getByTestId('shelf-empty-hint')
        .textContent,
    ).toContain(text)
  })
})

Then('My tools is hidden', async () => {
  await waitFor(() => {
    expect(screen.queryByTestId('my-tools')).toBeNull()
  })
})

When('I choose to sign in from My tools', async () => {
  const user = userEvent.setup()
  await user.click(
    within(screen.getByTestId('my-tools')).getByRole('button', {
      name: 'Sign in',
    }),
  )
})

Then('I am asked to sign in', async () => {
  expect(await screen.findByRole('heading', { name: 'Sign In' })).toBeTruthy()
})

Then('Recently opened shows {string}', async (_world, name: string) => {
  await waitFor(() => {
    expect(recentNames()).toContain(name)
  })
})

Then(
  'Recently opened shows {string} opened {string}',
  async (_world, name: string, when: string) => {
    await waitFor(() => {
      const chip = within(screen.getByTestId('recently-opened'))
        .queryAllByTestId('recent-chip')
        .find(
          (c) => within(c).getByTestId('recent-chip-name').textContent === name,
        )
      if (!chip) throw new Error(`No "${name}" chip in Recently opened`)
      expect(within(chip).getByTestId('recent-chip-time').textContent).toBe(
        when,
      )
    })
  },
)

function recentNames(): string[] {
  return within(screen.getByTestId('recently-opened'))
    .queryAllByTestId('recent-chip-name')
    .map((n) => n.textContent)
}

Then('Recently opened lists {string}', async (_world, names: string) => {
  await waitFor(() => {
    expect(recentNames()).toEqual(names.split(', '))
  })
})

Then('Recently opened is hidden', () => {
  expect(screen.queryByTestId('recently-opened')).toBeNull()
})

Then('Most opened by colleagues still lists every tool', async () => {
  await waitFor(() => {
    expect(communityList('community-feed').map(rowName).sort()).toEqual(
      liveToolNames().sort(),
    )
  })
})

Then(
  'Most opened by colleagues does not list {string}',
  async (_world, name: string) => {
    await waitFor(() => {
      expect(communityList('community-feed').length).toBeGreaterThan(0)
    })
    expect(communityList('community-feed').map(rowName)).not.toContain(name)
  },
)

Then('the results show {string} as archived', async (_world, name: string) => {
  await waitFor(() => {
    const row = rowNamed('community-results', name)
    expect(within(row).getByTestId('lifecycle-badge').textContent).toBe(
      'Archived',
    )
  })
})

When('I pin {string} from the feed', async (_world, name: string) => {
  const user = userEvent.setup()
  const row = await waitFor(() => rowNamed('community-feed', name))
  await user.click(within(row).getByTestId('pin-button'))
})

Then('I am told {string}', async (_world, text: string) => {
  await waitFor(() => {
    expect(screen.getByTestId('toast').textContent).toContain(text)
  })
})

When('I choose the tag {string}', async (_world, label: string) => {
  const user = userEvent.setup()
  const chip = await waitFor(() => {
    const found = within(screen.getByTestId('tag-row'))
      .getAllByTestId('tool-tag')
      .find((c) => c.textContent.startsWith(label))
    if (!found) throw new Error(`No "${label}" chip in the tag row`)
    return found
  })
  await user.click(chip)
})

Then(
  'every listed tool carries the tag {string}',
  async (_world, label: string) => {
    await waitFor(() => {
      const rows = communityList('community-feed')
      expect(rows.length).toBeGreaterThan(0)
      for (const row of rows) {
        expect(
          within(row)
            .getAllByTestId('tool-tag')
            .map((c) => c.textContent),
        ).toContain(label)
      }
      expect(rows.length).toBeLessThan(liveToolNames().length)
    })
  },
)

Then(
  'the results include every tool tagged {string}',
  async (_world, word: string) => {
    const tagged = namesTagged(word)
    expect(tagged.length).toBeGreaterThan(0)
    await waitFor(() => {
      expect(communityList('community-results').map(rowName)).toEqual(
        expect.arrayContaining(tagged),
      )
    })
  },
)

/* ------------------------------------------------------ Community tool card ---
 * The card over the page: what identifies the tool, stepping through the list
 * it was opened from, pinning, and the comment box that keeps its own keys.
 */

function toolCard(): HTMLElement {
  return screen.getByTestId('tool-card')
}

function cardToolName(): string {
  return within(toolCard()).getByTestId('card-tool-name').textContent.trim()
}

function commentBox(): HTMLTextAreaElement {
  return within(toolCard()).getByLabelText(/^Know more about /)
}

/** The tool's opens this month on the server just before its card opened. */
let opensBefore: number | null = null

async function openCard(name: string): Promise<void> {
  if (!current) throw new Error('No catalog opened — missing a Given step?')
  const tools = current.backend.communityTools
  opensBefore = tools.get({ slug: tools.slugOf(name) }).views30d
  // A card opens from the page, so a scenario may start anywhere.
  if (!screen.queryByLabelText('Search community tools')) await openCommunity()
  const user = userEvent.setup()
  const row = await waitFor(() => rowNamed('community-feed', name))
  await user.click(within(row).getByTestId('feed-row-name'))
  await waitFor(() => expect(cardToolName()).toBe(name))
}

/** A tool the server holds, as its row in the feed names it. */
function feedNames(): string[] {
  return communityList('community-feed').map(rowName)
}

Given('{string} was just added', async (_world, name: string) => {
  await givenOnServer(({ backendCfg }) => {
    backendCfg.communityTools.seed({
      name,
      url: `https://${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pages.example.com/`,
      // Its first visit has not run yet.
      lastCheckAt: null,
    })
  })
  // The card asks again every few seconds while it waits; fake clocks let a
  // scenario step over that wait. They still tick with real time, so the
  // network and user-event delays run as usual.
  vi.useFakeTimers({
    shouldAdvanceTime: true,
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
  })
})

afterEach(() => {
  vi.useRealTimers()
})

Given(
  '{string} was just added on a host outside the capture list',
  async (_world, name: string) => {
    await givenOnServer(({ backendCfg }) => {
      backendCfg.communityTools.seed({
        name,
        url: `https://${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.other.test/`,
        lastCheckAt: null,
      })
    })
  },
)

Then('the card says there is no screenshot', async () => {
  await waitFor(() => {
    const box = within(toolCard()).getByTestId('card-screenshot-box')
    expect(box.dataset['state']).toBe('missing')
    expect(box.textContent).toContain('No screenshot')
  })
})

Given(
  '{string} was archived by {string}',
  async (_world, tool: string, name: string) => {
    await givenOnServer(({ backendCfg }) => {
      const tools = backendCfg.communityTools
      tools.archiveAs(tools.slugOf(tool), name)
    })
  },
)

// The clock is faked from "was just added" on. Each step moves it under 3 s:
// quickpickle's own step timeout is a timer on that same clock, so a step that
// jumped the card's whole 5 s wait would time itself out.
const CLOCK_STEP_MS = 2600

When('its first screenshot is taken', () => {
  if (!current) throw new Error('No catalog opened — missing a Given step?')
  const tools = current.backend.communityTools
  tools.finishCapture(tools.slugOf(cardToolName()))
  vi.advanceTimersByTime(CLOCK_STEP_MS)
})

When('a few seconds pass', () => {
  vi.advanceTimersByTime(CLOCK_STEP_MS)
})

When(
  'I open the card of {string} from an old link',
  async (_world, name: string) => {
    if (!current) throw new Error('No catalog opened — missing a Given step?')
    const tools = current.backend.communityTools
    await current.router.navigate({
      to: '/community/$slug',
      params: { slug: tools.slugOf(name) },
    })
    await waitFor(() => expect(cardToolName()).toBe(name))
  },
)

When('I choose the tag {string} on the card', async (_world, label: string) => {
  const user = userEvent.setup()
  const chip = within(within(toolCard()).getByTestId('card-tags'))
    .getAllByTestId('tool-tag')
    .find((c) => c.textContent.startsWith(label))
  if (!chip) throw new Error(`No "${label}" chip on the card`)
  await user.click(chip)
})

Then('the card explains {string}', async (_world, text: string) => {
  await waitFor(() => {
    expect(
      within(toolCard()).getByTestId('lifecycle-note').textContent,
    ).toContain(text)
  })
})

Then('the comments read first and the comment box comes last', async () => {
  const block = within(toolCard()).getByTestId('card-comments')
  const heading = within(block).getByRole('heading', { name: 'Comments' })
  const said = await waitFor(
    () =>
      within(block).queryByRole('list', { name: 'Comments' }) ??
      within(block).getByText(/No comments yet/),
  )
  const box = commentBox()
  const follows = (a: Element, b: Element) =>
    (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
  expect(follows(heading, said)).toBe(true)
  expect(follows(said, box)).toBe(true)
})

When('I open the card of {string}', async (_world, name: string) => {
  await openCard(name)
})

When('I open the card of the first tool', async () => {
  const first = await waitFor(() => {
    const name = feedNames()[0]
    if (!name) throw new Error('The feed is empty')
    return name
  })
  await openCard(first)
})

When('I close the card', async () => {
  const user = userEvent.setup()
  await user.click(within(toolCard()).getByRole('button', { name: 'Close' }))
  await waitFor(() => expect(screen.queryByTestId('tool-card')).toBeNull())
})

When('I press the right arrow', async () => {
  await userEvent.setup().keyboard('{ArrowRight}')
})

When('I press the left arrow', async () => {
  await userEvent.setup().keyboard('{ArrowLeft}')
})

When('I pin it', async () => {
  const user = userEvent.setup()
  await user.click(within(toolCard()).getByTestId('pin-button'))
})

When('I type {string} in the comment box', async (_world, text: string) => {
  const user = userEvent.setup()
  await user.click(commentBox())
  await user.keyboard(text)
})

When('I press Enter on the card', async () => {
  openSpy ??= vi.spyOn(window, 'open').mockImplementation(() => null)
  openSpy.mockClear()
  toolCard().focus()
  await userEvent.setup().keyboard('{Enter}')
})

Then('the card shows the screenshot', async () => {
  await waitFor(() => {
    const box = within(toolCard()).getByTestId('card-screenshot-box')
    expect(box.dataset['state']).toBe('captured')
    expect(within(box).getByRole('img').getAttribute('src')).toMatch(
      /^\/api\/screenshots\//,
    )
  })
  expect(within(toolCard()).getByTestId('card-screenshot').textContent).toMatch(
    /Screenshot captured \d{1,2} \w{3} \d{4}/,
  )
})

Then('the card shows how to use it', () => {
  if (!current) throw new Error('No catalog opened — missing a Given step?')
  const tools = current.backend.communityTools
  const tool = tools.get({ slug: tools.slugOf(cardToolName()) })
  expect(
    within(toolCard()).getByTestId('card-how-to-use').textContent,
  ).toContain(tool.descriptionMd)
})

Then('the card shows {string} as owner', (_world, name: string) => {
  expect(
    within(toolCard())
      .getAllByTestId('card-owner')
      .map((o) => o.textContent.trim()),
  ).toContain(name)
})

Then('the card counts one more open this month', async () => {
  if (opensBefore === null) throw new Error('No card opened')
  const expected = (opensBefore + 1).toLocaleString('en-US')
  await waitFor(() => {
    expect(within(toolCard()).getByTestId('card-views').textContent).toContain(
      `${expected} opens this month`,
    )
  })
})

Then('the card shows the second tool', async () => {
  const second = feedNames()[1]
  await waitFor(() => expect(cardToolName()).toBe(second))
  expect(within(toolCard()).getByTestId('card-position').textContent).toBe(
    `2 of ${feedNames().length}`,
  )
})

Then('the card still shows the first tool', () => {
  expect(cardToolName()).toBe(feedNames()[0])
})

Then('the caret in the comment box is at {int}', (_world, position: number) => {
  const box = commentBox()
  expect(document.activeElement).toBe(box)
  expect([box.selectionStart, box.selectionEnd]).toEqual([position, position])
})

Then('the card says {string}', async (_world, text: string) => {
  await waitFor(() => {
    expect(
      within(toolCard()).getByTestId('card-title-block').textContent,
    ).toContain(text)
  })
})

Then(
  '{string} is ranked below every working tool',
  async (_world, name: string) => {
    await waitFor(() => expect(feedNames()).toContain(name))
    expect(feedNames().at(-1)).toBe(name)
  },
)

Then("the card's comments show {string}", async (_world, text: string) => {
  await waitFor(() => {
    expect(
      within(within(toolCard()).getByTestId('card-comments'))
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(expect.arrayContaining([expect.stringContaining(text)]))
  })
})

Then('no site opened', () => {
  expect(openSpy?.mock.calls ?? []).toEqual([])
})

Then('the card says it is taking a screenshot', async () => {
  await waitFor(() => {
    const box = within(toolCard()).getByTestId('card-screenshot-box')
    expect(box.dataset['state']).toBe('capturing')
    expect(box.textContent).toContain('Taking a screenshot of the site')
  })
})

Then('the screenshot box keeps the shape of a screenshot', () => {
  // jsdom lays nothing out, so the reserved height is read off the class that
  // reserves it: the same 16:10 box the captured screenshot fills.
  const box = within(toolCard()).getByTestId('card-screenshot-box')
  expect(box.className).toContain('aspect-[16/10]')
  expect(box.className).toContain('w-full')
})

Then('the card is closed', async () => {
  await waitFor(() => expect(screen.queryByTestId('tool-card')).toBeNull())
})
