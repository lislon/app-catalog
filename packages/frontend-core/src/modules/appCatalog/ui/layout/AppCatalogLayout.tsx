import type { TRPCRouter } from '@igstack/app-catalog-backend-core'
import type { QueryClient } from '@tanstack/react-query'
import type { TRPCClient } from '@trpc/client'
import { useUiSettings } from '~/context/UiSettingsContext'
import { AppCatalogProvider } from '~/modules/appCatalog/context/AppCatalogContext'
import { AppCatalogFiltersProvider } from '~/modules/appCatalog/ui/context/AppCatalogFiltersContext'
import { MainLayout } from '~/ui/layout/MainLayout'
import { TopLevelProviders } from '~/ui/layout/TopLevelProviders'

export interface AppCatalogLayoutProps {
  children: React.ReactNode
  queryClient: QueryClient
  trpcClient: TRPCClient<TRPCRouter>
  headerMiddle?: React.ReactNode
}

export function AppCatalogLayout({
  children,
  queryClient,
  trpcClient,
  headerMiddle,
}: AppCatalogLayoutProps) {
  const uiSettings = useUiSettings()
  const filterableTagPrefixes = uiSettings.filterPane?.filterByTagPrefixes ?? []

  return (
    <TopLevelProviders queryClient={queryClient} trpcClient={trpcClient}>
      <AppCatalogProvider>
        <AppCatalogFiltersProvider
          filterableTagPrefixes={filterableTagPrefixes}
        >
          <MainLayout headerMiddle={headerMiddle}>
            {/* <Breadcrumb className="pb-4">*/}
            {/*  <BreadcrumbList>*/}
            {/*    <BreadcrumbItem>*/}
            {/*      <BreadcrumbLink asChild>*/}
            {/*        <Link to={'/'} className="flex items-center gap-1">*/}
            {/*          <HomeIcon className="size-4" />*/}
            {/*          <span className="sr-only">Home</span>*/}
            {/*        </Link>*/}
            {/*      </BreadcrumbLink>*/}
            {/*    </BreadcrumbItem>*/}
            {/*    <BreadcrumbSeparator />*/}
            {/*    <BreadcrumbItem>*/}
            {/*      <BreadcrumbLink asChild>*/}
            {/*        <Link to="/catalog/apps">App Catalog</Link>*/}
            {/*      </BreadcrumbLink>*/}
            {/*    </BreadcrumbItem>*/}
            {/*  </BreadcrumbList>*/}
            {/* </Breadcrumb>*/}
            <div className="flex flex-1 w-full justify-center min-h-0">
              {children}
            </div>
          </MainLayout>
        </AppCatalogFiltersProvider>
      </AppCatalogProvider>
    </TopLevelProviders>
  )
}
