import type { QueryClient } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

export default function DevtoolsPanels({ client }: { client: QueryClient }) {
  return (
    <>
      <TanStackRouterDevtools />
      <ReactQueryDevtools initialIsOpen={false} client={client} />
    </>
  )
}
