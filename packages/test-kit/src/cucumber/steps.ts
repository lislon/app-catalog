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
import { act, screen, waitFor, within } from '@testing-library/react'
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

async function openCommunity(): Promise<void> {
  const user = userEvent.setup()
  await user.click(await waitFor(() => sectionTab('Community tools')))
  await waitFor(() => {
    expect(screen.getByLabelText('Search community tools')).toBeTruthy()
  })
}

When('I open Community tools', openCommunity)

When('I go to {string}', async (_world, path: string) => {
  if (!current) throw new Error('No catalog opened — missing a Given step?')
  await current.router.navigate({ href: path })
})

Then('the page is not found', async () => {
  expect(
    await screen.findByRole('heading', { name: '404 Not Found' }),
  ).toBeTruthy()
})

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

Then('My tools is hidden', async () => {
  await waitFor(() => {
    expect(screen.queryByTestId('my-tools')).toBeNull()
  })
})

Then('I am asked to sign in', async () => {
  expect(await screen.findByRole('heading', { name: 'Sign In' })).toBeTruthy()
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

/** Where a tool's site is, as the server holds it. */
function siteOf(name: string): string {
  if (!current) throw new Error('No catalog opened — missing a Given step?')
  const tools = current.backend.communityTools
  return tools.get({ slug: tools.slugOf(name) }).url
}

function expectOpensInNewTab(link: HTMLElement, name: string): void {
  expect(link.tagName).toBe('A')
  expect(link.getAttribute('href')).toBe(siteOf(name))
  expect(link.getAttribute('target')).toBe('_blank')
  expect(link.getAttribute('rel')).toBe('noopener noreferrer')
}

Then(
  'the row of {string} opens its site in a new tab',
  async (_world, name: string) => {
    const row = await waitFor(() => rowNamed('community-feed', name))
    expectOpensInNewTab(
      within(row).getByRole('link', {
        name: `${name}, opens ${new URL(siteOf(name)).host} in a new tab`,
      }),
      name,
    )
  },
)

When('I choose Details on {string}', async (_world, name: string) => {
  const row = await waitFor(() => rowNamed('community-feed', name))
  await userEvent
    .setup()
    .click(within(row).getByRole('link', { name: `Details for ${name}` }))
})

function rowStar(name: string): HTMLElement {
  return within(rowNamed('community-feed', name)).getByTestId('pin-button')
}

// jsdom has no hover, so "in sight" is read off the classes: nothing hides it.
Then(
  'the star on {string} is in sight, {word}',
  async (_world, name: string, state: string) => {
    await waitFor(() => {
      const star = rowStar(name)
      expect(star.getAttribute('aria-pressed')).toBe(
        state === 'pinned' ? 'true' : 'false',
      )
      expect(star.getAttribute('class')).not.toMatch(/opacity-0/)
    })
  },
)

Then(
  'tabbing through the row of {string} reaches {string}',
  async (_world, name: string, stops: string) => {
    const row = await waitFor(() => rowNamed('community-feed', name))
    const user = userEvent.setup()
    within(row).getByTestId('feed-row-name').focus()
    const reached = [document.activeElement]
    for (let i = 1; i < stops.split(', ').length; i++) {
      await user.tab()
      reached.push(document.activeElement)
    }
    expect(
      reached.map((el) =>
        el?.getAttribute('data-testid') === 'feed-row-name'
          ? 'site'
          : el?.getAttribute('data-testid') === 'pin-button'
            ? 'star'
            : (el?.getAttribute('aria-label')?.split(' ')[0] ?? '?'),
      ),
    ).toEqual(stops.split(', '))
  },
)

Given(
  '{string} liked {string}',
  async (_world, names: string, tool: string) => {
    await givenOnServer(({ backendCfg }) => {
      const tools = backendCfg.communityTools
      tools.likedBy(tools.slugOf(tool), names.split(', '))
    })
  },
)

function rowLike(name: string): HTMLElement {
  return within(rowNamed('community-feed', name)).getByTestId('like-button')
}

When('I like {string}', async (_world, name: string) => {
  const like = await waitFor(() => rowLike(name))
  await userEvent.setup().click(like)
})

Then(
  'the server counts {int} like(s) on {string}',
  async (_world, count: number, name: string) => {
    if (!current) throw new Error('No catalog opened — missing a Given step?')
    const tools = current.backend.communityTools
    await waitFor(() => {
      expect(tools.get({ slug: tools.slugOf(name) }).likes).toBe(count)
    })
  },
)

Then('the caret is on the like of {string}', (_world, name: string) => {
  expect(document.activeElement).toBe(rowLike(name))
  const index = rowLike(name)
    .closest('[data-index]')
    ?.getAttribute('data-index')
  expect(index).toBe(
    String(communityList('community-feed').map(rowName).indexOf(name)),
  )
})

async function expectLikes(name: string, count: number, mine: boolean) {
  await waitFor(() => {
    const like = rowLike(name)
    expect(within(like).getByTestId('like-count').textContent).toBe(
      String(count),
    )
    expect(like.getAttribute('aria-pressed')).toBe(String(mine))
  })
}

Then(
  '{string} has {int} like(s), liked by me',
  (_world, name: string, count: number) => expectLikes(name, count, true),
)

Then(
  '{string} has {int} like(s), not liked by me',
  (_world, name: string, count: number) => expectLikes(name, count, false),
)

Then(
  'pointing at the like of {string} says {string}',
  async (_world, name: string, text: string) => {
    // By keyboard: a click closes the tooltip under the pointer that made
    // it, and focus is the other way it opens.
    const like = rowLike(name)
    await userEvent.setup().unhover(like)
    act(() => {
      like.blur()
      like.focus()
    })
    await waitFor(() => {
      expect(screen.getByRole('tooltip').textContent).toBe(text)
    })
  },
)

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
      // Rows show no tags; the server says what each listed tool carries.
      const names = communityList('community-feed').map(rowName)
      expect(names.length).toBeGreaterThan(0)
      expect(namesTagged(label)).toEqual(expect.arrayContaining(names))
      expect(names.length).toBeLessThan(liveToolNames().length)
    })
  },
)

Then(
  'the card says there is {int} community tool(s) for it',
  async (_world, count: number) => {
    const link = await screen.findByTestId('app-community-tools')
    expect(link.textContent).toMatch(new RegExp(`· ${count}$`))
  },
)

Then('the card does not mention community tools', async () => {
  // The count arrives after the card: wait until it has been answered.
  await waitFor(() => {
    expect(current?.backend.communityTools.countsAnswered).toBeGreaterThan(0)
  })
  await waitFor(() => expect(ui().app.getOpenTitle()).toBeTruthy())
  expect(screen.queryByTestId('app-community-tools')).toBeNull()
})

When('I follow that link', async () => {
  await userEvent.setup().click(screen.getByTestId('app-community-tools'))
})

Then('the feed is filtered to {string}', async (_world, tag: string) => {
  await waitFor(() => {
    expect(current?.router.state.location.search).toMatchObject({ tag })
  })
})

Given(
  'the site of {string} changed {int} day(s) ago',
  async (_world, name: string, days: number) => {
    // On the real clock: the row measures "N days ago" against it.
    const at = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    await givenOnServer(({ backendCfg }) => {
      const tools = backendCfg.communityTools
      tools.siteUpdated(tools.slugOf(name), at)
    })
  },
)

When('I sort by {string}', async (_world, label: string) => {
  await userEvent.setup().click(
    within(await screen.findByTestId('feed-sort')).getByRole('radio', {
      name: new RegExp(`^${label}`),
    }),
  )
})

Then('the feed reads {string}', async (_world, names: string) => {
  await waitFor(() => {
    expect(communityList('community-feed').map(rowName).join(', ')).toBe(names)
  })
})

Then('the feed is headed {string}', async (_world, heading: string) => {
  await waitFor(() => {
    expect(
      within(screen.getByTestId('community-feed')).getByRole('heading', {
        level: 2,
      }).textContent,
    ).toBe(heading)
  })
  expect(screen.getByRole('region', { name: heading })).toBeTruthy()
})

Then('the sort says {string}', async (_world, label: string) => {
  await waitFor(() => {
    expect(screen.getByTestId('feed-sort').getAttribute('aria-label')).toBe(
      label,
    )
  })
})

Then(
  'the row of {string} says {string}',
  async (_world, name: string, text: string) => {
    await waitFor(() => {
      expect(
        within(rowNamed('community-feed', name)).getByTestId('feed-row-date')
          .textContent,
      ).toContain(text)
    })
  },
)

Given(
  '{string} has {int} comments',
  async (_world, name: string, count: number) => {
    await givenOnServer(({ backendCfg }) => {
      const tools = backendCfg.communityTools
      tools.commentedOn(tools.slugOf(name), count)
    })
  },
)

Then(
  'the row of {string} shows {int} comments',
  async (_world, name: string, count: number) => {
    await waitFor(() => {
      expect(
        within(rowNamed('community-feed', name)).getByTestId(
          'feed-row-comments',
        ).textContent,
      ).toBe(`${count} comments`)
    })
  },
)

Then('the row of {string} shows no comments', (_world, name: string) => {
  expect(
    within(rowNamed('community-feed', name)).queryByTestId('feed-row-comments'),
  ).toBeNull()
})

Then('the feed lists {string}', async (_world, name: string) => {
  await waitFor(() => {
    expect(communityList('community-feed').map(rowName)).toContain(name)
  })
})

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
  // The row itself opens the site; its Details panel opens the card.
  await user.click(
    within(row).getByRole('link', { name: `Details for ${name}` }),
  )
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
    expect(within(box).queryByRole('link')).toBeNull()
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

Then('the screenshot opens the site in a new tab', () => {
  expectOpensInNewTab(
    within(toolCard()).getByTestId('card-screenshot-link'),
    cardToolName(),
  )
})

When('I enlarge the screenshot', async () => {
  await userEvent.setup().click(
    within(toolCard()).getByRole('button', {
      name: `Enlarge screenshot of ${cardToolName()}`,
    }),
  )
})

Then('the full-size viewer opens', async () => {
  expect(
    await screen.findByRole('dialog', {
      name: `${cardToolName()} screenshot`,
    }),
  ).toBeTruthy()
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

Then("the card's badge reads {string}", async (_world, text: string) => {
  await waitFor(() => {
    expect(within(toolCard()).getByTestId('lifecycle-badge').textContent).toBe(
      text,
    )
  })
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

Then(
  "the card's line {string} cannot be edited or withdrawn",
  async (_world, text: string) => {
    const line = await waitFor(() => {
      const found = within(within(toolCard()).getByTestId('card-comments'))
        .getAllByRole('listitem')
        .find((li) => li.textContent.includes(text))
      if (!found) throw new Error(`No comment line reads "${text}"`)
      return found
    })
    expect(within(line).queryAllByRole('button')).toEqual([])
  },
)

Then('no site opened', () => {
  expect(openSpy?.mock.calls ?? []).toEqual([])
})

Then('the card says it is taking a screenshot', async () => {
  await waitFor(() => {
    const box = within(toolCard()).getByTestId('card-screenshot-box')
    expect(box.dataset['state']).toBe('capturing')
    expect(box.textContent).toContain('Taking a screenshot of the site')
    expect(within(box).queryByRole('link')).toBeNull()
  })
})

Then('the screenshot box keeps the shape of a screenshot', () => {
  // jsdom lays nothing out, so the reserved height is read off the class that
  // reserves it: the same 16:10 box the captured screenshot fills.
  const box = within(toolCard()).getByTestId('card-screenshot-box')
  expect(box.className).toContain('aspect-[16/10]')
  expect(box.className).toContain('w-full')
  // Capped, so how to use it stays above the fold.
  expect(box.className).toContain('max-h-[320px]')
})

Then('the card is closed', async () => {
  await waitFor(() => expect(screen.queryByTestId('tool-card')).toBeNull())
})

/* ------------------------------------------------------ Adding a tool ---
 * The add and edit form, the admin's Approve and Archive on the card, and the
 * sign-in a visitor is sent through first, which must bring them back.
 */

function toolForm(): HTMLElement {
  const form =
    screen.queryByTestId('add-tool-dialog') ??
    screen.queryByTestId('edit-tool-dialog')
  if (!form) throw new Error('No add or edit form is open')
  return form
}

function formField(label: RegExp): HTMLInputElement {
  return within(toolForm()).getByLabelText<HTMLInputElement>(label)
}

/** The chips of a picker field, as their labels read. */
function chipsOf(label: RegExp): string[] {
  const box = formField(label).parentElement
  if (!box) throw new Error(`No box around the ${String(label)} field`)
  return within(box)
    .queryAllByTestId('picker-chip-label')
    .map((c) => c.textContent.trim())
}

function store() {
  if (!current) throw new Error('No catalog opened — missing a Given step?')
  return current.backend.communityTools
}

/** The address pasted last, so a step can ask what the page there is called. */
let pastedUrl: string | null = null

afterEach(() => {
  pastedUrl = null
})

When('I choose to add a tool', async () => {
  await userEvent
    .setup()
    .click(await screen.findByRole('button', { name: 'Add a tool' }))
})

When('I choose to add it', async () => {
  await userEvent.setup().click(
    within(screen.getByTestId('no-results')).getByRole('button', {
      name: 'Add it',
    }),
  )
})

Then('the add form opens with the name {string}', async (_world, name) => {
  await waitFor(() => {
    expect(
      within(screen.getByTestId('add-tool-dialog')).getByLabelText('Name'),
    ).toHaveProperty('value', name)
  })
})

When('I paste {string}', async (_world, text: string) => {
  pastedUrl = text
  const user = userEvent.setup()
  await user.click(await waitFor(() => formField(/^Site address/)))
  await user.paste(text)
})

Given(
  'the page {string} called {string} takes {int} ms to read',
  async (_world, url: string, title: string, ms: number) => {
    await givenOnServer(({ backendCfg }) =>
      backendCfg.communityTools.withPage(url, title, ms),
    )
  },
)

Then('the site is being read', async () => {
  await waitFor(() => expect(store().previewsAsked).toContain(pastedUrl))
})

When('I replace the address with {string}', async (_world, url: string) => {
  pastedUrl = url
  const user = userEvent.setup()
  await user.clear(formField(/^Site address/))
  await user.paste(url)
})

When('the answer for {string} arrives', async (_world, url: string) => {
  await waitFor(() => expect(store().previewsAnswered).toContain(url), {
    timeout: 2500,
  })
  // The mock has answered; give the page the moment it needs to take it in,
  // so a check after this one cannot pass before a stale answer lands.
  await new Promise((resolve) => setTimeout(resolve, 150))
})

Then('there is something to publish', async () => {
  await waitFor(() => {
    expect(
      within(toolForm()).getByRole('button', { name: 'Publish' }),
    ).toHaveProperty('disabled', false)
  })
})

Then('the name is filled in from the page title', async () => {
  const title = pastedUrl && store().pageTitle(pastedUrl)
  if (!title) throw new Error(`No page title for "${pastedUrl}"`)
  await waitFor(() => {
    expect(formField(/^Name/).value).toBe(title)
  })
})

Then('a screenshot preview appears', async () => {
  await waitFor(() => {
    expect(
      within(toolForm())
        .getByAltText('Screenshot preview of the site')
        .getAttribute('src'),
    ).toMatch(/^data:image\//)
  })
})

When('I add {string} as owner', async (_world, name: string) => {
  const user = userEvent.setup()
  await user.click(formField(/^Owners/))
  await user.keyboard(name.split(' ')[0]!)
  await user.click(
    await within(toolForm()).findByRole('option', { name: new RegExp(name) }),
  )
  await waitFor(() => expect(chipsOf(/^Owners/)).toContain(name))
})

When(
  'I add {string}, who is not in the people list, as owner',
  async (_world, name: string) => {
    const user = userEvent.setup()
    await user.click(await waitFor(() => formField(/^Owners/)))
    await user.keyboard(name)
    const option = await within(toolForm()).findByRole('option', {
      // The typed part is highlighted, which spaces it in the name.
      name: new RegExp(`^Add “\\s*${name}\\s*”`),
    })
    expect(option.textContent).toContain('Not in the people list')
    await user.click(option)
    await waitFor(() => expect(chipsOf(/^Owners/)).toContain(name))
  },
)

Then('the owners are {string}', async (_world, names: string) => {
  await waitFor(() => {
    expect(chipsOf(/^Owners/).join(', ')).toBe(names)
  })
})

When('I describe it as {string}', async (_world, text: string) => {
  const user = userEvent.setup()
  await user.click(await waitFor(() => formField(/^How to use/)))
  await user.paste(text)
})

When('I preview the description', async () => {
  await userEvent
    .setup()
    .click(within(toolForm()).getByRole('tab', { name: 'Preview' }))
})

Then('the preview shows {string} in bold', async (_world, text: string) => {
  await waitFor(() => {
    const preview = within(toolForm()).getByTestId('description-preview')
    expect(
      [...preview.querySelectorAll('strong')].map((b) => b.textContent),
    ).toContain(text)
  })
})

async function typeTag(text: string, pick?: string): Promise<void> {
  const user = userEvent.setup()
  await user.click(await waitFor(() => formField(/^Tags/)))
  await user.keyboard(text)
  if (pick) {
    await user.click(
      await within(toolForm()).findByRole('option', {
        name: new RegExp(`^${pick}`),
      }),
    )
  } else {
    await user.keyboard('{Enter}')
  }
}

When(
  'I tag it with the app {string} and the topic {string}',
  async (_world, app: string, topic: string) => {
    await typeTag(app.split(' ')[0]!, app)
    await typeTag(topic)
    await waitFor(() => {
      expect(chipsOf(/^Tags/)).toEqual([app, topic])
    })
  },
)

When('I tag it with the topic {string}', async (_world, topic: string) => {
  await typeTag(topic)
})

When(
  'I type {string} in the tags, move down and press Enter',
  async (_world, text: string) => {
    const user = userEvent.setup()
    await user.click(await waitFor(() => formField(/^Tags/)))
    await user.keyboard(text)
    await within(toolForm()).findByRole('option', { name: /.+/ })
    await user.keyboard('{ArrowDown}{Enter}')
  },
)

Then('the tags read {string}', async (_world, tags: string) => {
  await waitFor(() => {
    expect(chipsOf(/^Tags/).join(', ')).toBe(tags)
  })
})

Then('the topics read {string}', async (_world, topics: string) => {
  await waitFor(() => {
    expect(chipsOf(/^Tags/).join(', ')).toBe(topics)
  })
})

When('I publish', async () => {
  // Publish waits for the site to be read; a person waits for it too.
  const publish = await waitFor(() => {
    const button = within(toolForm()).getByRole('button', { name: 'Publish' })
    expect(button).toHaveProperty('disabled', false)
    return button
  })
  await userEvent.setup().click(publish)
})

Then('I am told it is live now', async () => {
  await waitFor(() => {
    expect(screen.getByTestId('toast').textContent).toContain(
      'Live now, in the review list',
    )
  })
  expect(screen.queryByTestId('add-tool-dialog')).toBeNull()
  expect(
    within(screen.getByTestId('toast')).getByRole('button', {
      name: 'Open card',
    }),
  ).toBeTruthy()
})

Then('{string} is listed under Newest', async (_world, name: string) => {
  await userEvent.setup().click(screen.getByRole('radio', { name: /^Newest/ }))
  await waitFor(() => expect(feedNames()[0]).toBe(name))
})

Then('{string} is marked new, not reviewed', async (_world, name: string) => {
  await waitFor(() => {
    expect(
      within(rowNamed('community-feed', name)).getByTestId('unreviewed-badge')
        .textContent,
    ).toBe('New · not reviewed')
  })
})

Then(
  '{string} was added by {string}',
  (_world, tool: string, person: string) => {
    expect(store().inspect(tool).addedBy.name).toBe(person)
  },
)

Then('{int} tool(s) is/are awaiting review', (_world, count: number) => {
  expect(store().awaitingReview()).toBe(count)
})

When('I approve it', async () => {
  await userEvent
    .setup()
    .click(within(toolCard()).getByRole('button', { name: 'Approve' }))
})

Then('{string} is no longer marked new', async (_world, name: string) => {
  expect(cardToolName()).toBe(name)
  await waitFor(() => {
    expect(within(toolCard()).queryByTestId('unreviewed-badge')).toBeNull()
  })
})

Then('there is no way to approve it', async () => {
  await waitFor(() => expect(cardToolName()).toBeTruthy())
  expect(
    within(toolCard()).queryByRole('button', { name: 'Approve' }),
  ).toBeNull()
  expect(
    within(toolCard()).queryByRole('button', { name: 'Archive' }),
  ).toBeNull()
})

Then('there is no way to edit it', async () => {
  await waitFor(() => expect(cardToolName()).toBeTruthy())
  expect(within(toolCard()).queryByRole('button', { name: 'Edit' })).toBeNull()
})

When('I archive it because {string}', async (_world, reason: string) => {
  const user = userEvent.setup()
  // From the edit form when it is open, otherwise the admin's card control.
  const where = screen.queryByTestId('edit-tool-dialog') ?? toolCard()
  await user.click(
    within(where).getByRole('button', {
      name: /^Archive( this tool)?$/,
    }),
  )
  await user.click(within(where).getByLabelText('Why archive it?'))
  await user.paste(reason)
  await user.click(within(where).getByRole('button', { name: 'Archive' }))
  // Done when the confirm step leaves: the edit form closes, the card's folds.
  await waitFor(() => {
    expect(
      where.isConnected && within(where).queryByTestId('archive-confirm'),
    ).toBeFalsy()
  })
})

Then(
  'I am warned that {string} is already listed',
  async (_world, name: string) => {
    await waitFor(() => {
      expect(
        within(toolForm()).getByTestId('duplicate-warning').textContent,
      ).toContain(`“${name}”`)
    })
  },
)

When('I open that card', async () => {
  await userEvent
    .setup()
    .click(within(toolForm()).getByRole('button', { name: 'Open that card' }))
})

Then('the card shows {string}', async (_world, name: string) => {
  await waitFor(() => expect(cardToolName()).toBe(name))
  expect(screen.queryByTestId('add-tool-dialog')).toBeNull()
})

Then(
  'I am told it is already in the catalog as {string}',
  async (_world, name: string) => {
    await waitFor(() => {
      expect(
        within(toolForm()).getByTestId('official-app-warning').textContent,
      ).toContain(`This is already in the catalog as ${name}.`)
    })
  },
)

When('I open {string} from the warning', async (_world, name: string) => {
  await userEvent
    .setup()
    .click(within(toolForm()).getByRole('link', { name: `Open ${name}` }))
})

When('I add it anyway', async () => {
  await userEvent
    .setup()
    .click(
      await within(toolForm()).findByRole('button', { name: 'Add anyway' }),
    )
})

Then('the add form asks for a name', async () => {
  await waitFor(() => expect(formField(/^Name/)).toBeTruthy())
  expect(within(toolForm()).queryByTestId('duplicate-warning')).toBeNull()
  expect(within(toolForm()).queryByTestId('official-app-warning')).toBeNull()
})

Then('I am told it is not a web address', async () => {
  await waitFor(() => {
    expect(within(toolForm()).getByRole('alert').textContent).toContain(
      'That is not a web address',
    )
  })
  expect(formField(/^Site address/).getAttribute('aria-invalid')).toBe('true')
})

Then('there is nothing to publish yet', () => {
  expect(
    within(toolForm()).getByRole('button', { name: 'Publish' }),
  ).toHaveProperty('disabled', true)
})

Then('I am told the name is missing', async () => {
  await waitFor(() => {
    const name = formField(/^Name/)
    expect(name.getAttribute('aria-invalid')).toBe('true')
    const error = document.getElementById(
      name.getAttribute('aria-describedby') ?? '',
    )
    expect(error?.textContent).toContain('Give it the name colleagues call it')
  })
})

Then('the caret is in the name', () => {
  expect(document.activeElement).toBe(formField(/^Name/))
})

When('I edit it', async () => {
  await userEvent
    .setup()
    .click(await within(toolCard()).findByRole('button', { name: 'Edit' }))
  await waitFor(() =>
    expect(screen.getByTestId('edit-tool-dialog')).toBeTruthy(),
  )
})

Then('the edit form offers no way to archive it', () => {
  expect(
    within(toolForm()).queryByRole('button', { name: 'Archive this tool' }),
  ).toBeNull()
})

Then('the edit form shows the name {string}', (_world, name: string) => {
  expect(formField(/^Name/).value).toBe(name)
})

When('I rename it to {string}', async (_world, name: string) => {
  const user = userEvent.setup()
  await user.clear(formField(/^Name/))
  await user.type(formField(/^Name/), name)
})

When('I save the changes', async () => {
  await userEvent
    .setup()
    .click(within(toolForm()).getByRole('button', { name: 'Save changes' }))
  await waitFor(() =>
    expect(screen.queryByTestId('edit-tool-dialog')).toBeNull(),
  )
})

Then('signing in brings me back to {string}', async (_world, path: string) => {
  // The provider round trip leaves the page, which a test cannot follow; the
  // address the modal will hand the provider is what decides where it lands.
  await waitFor(() => {
    expect(
      document
        .querySelector('[data-testid="login-modal"]')
        ?.getAttribute('data-return-to'),
    ).toBe(path)
  })
})
