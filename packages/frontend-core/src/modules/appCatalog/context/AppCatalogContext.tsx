import type {
  AppApprovalMethod,
  AppForCatalog,
  GroupingTagDefinition,
} from '@igstack/app-catalog-backend-core'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { createContext, use, useEffect, useMemo } from 'react'
import { ApiQueryMagazineAppCatalog } from '~/modules/appCatalog'

export interface VersionInfo {
  displayName: string
  url?: string
}

export interface AppVersionInfo {
  backend?: VersionInfo
  frontend?: VersionInfo
}

export interface AppCatalogContextIface {
  apps: Array<AppForCatalog>
  isLoadingApps: boolean
  tagsDefinitions: Array<GroupingTagDefinition>
  approvalMethods: Array<AppApprovalMethod>
  versions?: AppVersionInfo
}

export const AppCatalogContext = createContext<
  AppCatalogContextIface | undefined
>(undefined)

interface AppCatalogProviderProps {
  children: ReactNode
}

export function AppCatalogProvider({ children }: AppCatalogProviderProps) {
  const { data, isLoading: isLoadingApps } = useQuery(
    ApiQueryMagazineAppCatalog.getAppCatalog(),
  )

  const contextValue = useMemo<AppCatalogContextIface>(
    () => ({
      apps: data?.apps ?? [],
      isLoadingApps,
      tagsDefinitions: data?.tagsDefinitions ?? [],
      approvalMethods: data?.approvalMethods ?? [],
      versions: data?.versions,
    }),
    [
      data?.approvalMethods,
      data?.apps,
      data?.tagsDefinitions,
      data?.versions,
      isLoadingApps,
    ],
  )

  // Update document title based on backend version
  useEffect(() => {
    if (data?.versions?.backend?.displayName === 'local') {
      document.title = 'Local'
    } else {
      document.title = 'App Catalog'
    }
  }, [data?.versions?.backend?.displayName])

  return <AppCatalogContext value={contextValue}>{children}</AppCatalogContext>
}

export function useAppCatalogContext(): AppCatalogContextIface {
  const context = use(AppCatalogContext)
  if (!context) {
    throw new Error(
      'useAppCatalogContext must be used within AppCatalogProvider',
    )
  }
  return context
}
