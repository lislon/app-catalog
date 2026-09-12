# @igstack/app-catalog-test-kit

Integration test harness for App Catalog. `given()` mounts the real app against
a mock backend and a mock network (msw), then hands back page objects to drive
the UI with.

Runs in `jsdom` under `vitest` — no browser, no server, no database.

## Install

```sh
pnpm add -D @igstack/app-catalog-test-kit jsdom vitest
```

## Setup

```ts
// vite.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['@igstack/app-catalog-test-kit/setup'],
  },
})
```

The setup entry installs `@testing-library/jest-dom`, `fake-indexeddb`, a
`localStorage` polyfill and an SVG module mock.

## Usage

```ts
import { given, magazine } from '@igstack/app-catalog-test-kit'

it('filters the catalog by the search query', async () => {
  const { ui } = await given(magazine.full())

  await ui.catalog.search('taskflow')

  expect(ui.catalog.getTableData().map((r) => r.name)).toEqual(['TaskFlow'])
})
```

A _magazine_ is a named fixture: a function that populates the mock backend,
the mock network and the browser state before the app mounts. `given()` returns
`{ ui, backend, router }` — page objects, a verifier for what the backend was
asked, and the live router.

## License

MIT
