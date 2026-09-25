import { Suspense, lazy } from 'react'
import type { QueryClient } from '@tanstack/react-query'

// Dev-only: `import.meta.env.DEV` is false in production builds, so Rollup drops
// the import() and neither devtools package reaches the shipped bundle (#120).
const DevtoolsPanels = import.meta.env.DEV
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
