import type {
  AppApprovalMethod,
  AppForCatalog,
  AppVersionInfo,
  Group,
  GroupingTagDefinition,
  Person,
  SubResource,
} from '@igstack/app-catalog-backend-core'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { createContext, use, useEffect, useMemo } from 'react'
import { ApiQueryMagazineAppCatalog } from '~/modules/appCatalog'
import { useUiSettings } from '~/context/UiSettingsContext'

export interface AppCatalogContextIface {
  apps: AppForCatalog[]
  isLoadingApps: boolean
  tagsDefinitions: GroupingTagDefinition[]
  approvalMethods: AppApprovalMethod[]
  persons: Person[]
  groups: Group[]
  subResources?: SubResource[]
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
  const uiSettings = useUiSettings()

  const contextValue = useMemo<AppCatalogContextIface>(
    () => ({
      apps: data?.apps ?? [],
      isLoadingApps,
      tagsDefinitions: data?.tagsDefinitions ?? [],
      approvalMethods: data?.approvalMethods ?? [],
      persons: data?.persons ?? [],
      groups: data?.groups ?? [],
      subResources: data?.subResources ?? [],
      versions: {
        ...data?.versions,
        ...(uiSettings.frontendBuildId && {
          frontend: {
            displayName:
              uiSettings.frontendBuildId === 'local'
                ? 'local'
                : `#${uiSettings.frontendBuildId}`,
          },
        }),
      },
    }),
    [
      data?.approvalMethods,
      data?.apps,
      data?.tagsDefinitions,
      data?.persons,
      data?.groups,
      data?.subResources,
      data?.versions,
      uiSettings.frontendBuildId,
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
