import { createFileRoute } from '@tanstack/react-router'
import { AppCatalogLayout } from '~/modules/appCatalog/ui/layout/AppCatalogLayout'

export const Route = createFileRoute('/_layout/community')({
  component: RouteComponent,
})

function RouteComponent() {
  const { queryClient, trpcClient } = Route.useRouteContext()

  return (
    <AppCatalogLayout queryClient={queryClient} trpcClient={trpcClient}>
      <h1 className="font-serif text-2xl font-semibold">Community tools</h1>
    </AppCatalogLayout>
  )
}
