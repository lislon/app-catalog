import type {
  AppApprovalMethod,
  AppVersionInfo,
  Group,
  GroupingTagDefinition,
  Person,
  Resource,
} from '@igstack/app-catalog-backend-core'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { createContext, use, useEffect, useMemo } from 'react'
import { ApiQueryMagazineAppCatalog } from '~/modules/appCatalog'
import { useUiSettings } from '~/context/UiSettingsContext'
import { mergeFrontendBuildId } from '~/modules/appCatalog/context/mergeFrontendBuildId'

export interface AppCatalogContextIface {
  resources: Resource[]
  isLoadingApps: boolean
  tagsDefinitions: GroupingTagDefinition[]
  approvalMethods: AppApprovalMethod[]
  persons: Person[]
  groups: Group[]
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
      resources: data?.resources ?? [],
      isLoadingApps,
      tagsDefinitions: data?.tagsDefinitions ?? [],
      approvalMethods: data?.approvalMethods ?? [],
      persons: data?.persons ?? [],
      groups: data?.groups ?? [],
      versions: mergeFrontendBuildId(
        data?.versions ?? {},
        uiSettings.frontendBuildId,
      ),
    }),
    [
      data?.approvalMethods,
      data?.resources,
      data?.tagsDefinitions,
      data?.persons,
      data?.groups,
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

/**
 * The catalog, for a deployment that owns its own routes.
 *
 * A deployment composing its own route tree has to resolve its own path params
 * against the catalog — `/app/$slug/…/$account` means nothing until `$account`
 * is matched to a resource. It needs the resources to do that, and the loading
 * flag to tell "still fetching" from "no such resource", which is the
 * difference between a spinner and a redirect.
 *
 * Deliberately narrower than `useAppCatalogContext`: persons, groups, tags and
 * approval methods are the core's own rendering concerns, and publishing them
 * would make every one of them part of the supported surface.
 */
export function useCatalogResources(): {
  resources: Resource[]
  isLoading: boolean
} {
  const { resources, isLoadingApps } = useAppCatalogContext()
  return { resources, isLoading: isLoadingApps }
}
