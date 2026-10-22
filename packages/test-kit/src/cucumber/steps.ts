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
import { expect, vi } from 'vitest'
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

When('I open Community tools', async () => {
  const user = userEvent.setup()
  await user.click(await waitFor(() => sectionTab('Community tools')))
  await waitFor(() => {
    expect(screen.getByLabelText('Search community tools')).toBeTruthy()
  })
})

Then('the caret is in the search', async () => {
  await waitFor(() => {
    expect(document.activeElement).toBe(
      screen.getByLabelText('Search community tools'),
    )
  })
})

When('I press Enter', async () => {
  vi.spyOn(window, 'open').mockImplementation(() => null)
  vi.mocked(window.open).mockClear()
  const user = userEvent.setup()
  await user.keyboard('{Enter}')
})

Then('{string} opens in a new tab', (_world, url: string) => {
  expect(vi.mocked(window.open)).toHaveBeenCalledWith(
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
