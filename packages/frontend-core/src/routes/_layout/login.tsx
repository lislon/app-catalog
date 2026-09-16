import { createFileRoute } from '@tanstack/react-router'
import { LoginPage } from '~/modules/auth/ui/LoginPage'
import { MainLayout } from '~/ui/layout/MainLayout'
import { TopLevelProviders } from '~/ui/layout/TopLevelProviders'

export const Route = createFileRoute('/_layout/login')({
  component: RouteComponent,
})

function RouteComponent() {
  const { queryClient, trpcClient } = Route.useRouteContext()

  return (
    <TopLevelProviders queryClient={queryClient} trpcClient={trpcClient}>
      <MainLayout>
        {/*
          The page renders LoginPage itself rather than LoginModal. The modal is
          gated on AuthModalContext's `isOpen`, which nothing sets when the
          route is entered by URL, so this route used to render an empty page.
          The modal still exists and is still mounted app-wide by
          TopLevelProviders for `useAuthModal().open()` callers.
        */}
        <div
          className="mx-auto w-full max-w-md space-y-4"
          data-testid="login-page"
        >
          <h1 className="text-lg font-semibold">Sign In</h1>
          <p className="text-sm text-muted-foreground">
            Choose your sign-in method to authorize in App Catalog
          </p>
          <LoginPage />
        </div>
      </MainLayout>
    </TopLevelProviders>
  )
}
