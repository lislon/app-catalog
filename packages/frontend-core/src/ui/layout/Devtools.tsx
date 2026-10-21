import { Suspense, lazy } from 'react'
import type { QueryClient } from '@tanstack/react-query'

// Dev-only: `import.meta.env.DEV` is false in production builds, so Rollup drops
// the import() and neither devtools package reaches the shipped bundle (#120).
// Off under vitest too: nobody looks at them there, and every test file would
// otherwise transform both packages on its first mount.
const DevtoolsPanels =
  import.meta.env.DEV && import.meta.env.MODE !== 'test'
    ? lazy(() => import('./DevtoolsPanels'))
    : null

export function Devtools({ client }: { client: QueryClient }) {
  if (!DevtoolsPanels) return null
  return (
    <Suspense fallback={null}>
      <DevtoolsPanels client={client} />
    </Suspense>
  )
}
