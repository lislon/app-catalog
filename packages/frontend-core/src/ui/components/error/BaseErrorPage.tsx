import type { ReactNode } from 'react'
import { Devtools } from '~/ui/layout/Devtools'
import { MainLayout } from '~/ui/layout/MainLayout'
import { TopLevelProvidersForErrors } from '~/ui/layout/TopLevelProvidersForErrors'
import { useQueryClient } from '@tanstack/react-query'

export interface BaseErrorPageProps {
  children: ReactNode
}

/**
 * Common base component for all error pages
 * Provides consistent layout with TopLevelProvidersForErrors and MainLayout
 * Error pages should render their content as children of this component
 */
export function BaseErrorPage({ children }: BaseErrorPageProps) {
  const queryClient = useQueryClient()
  return (
    <TopLevelProvidersForErrors>
      <MainLayout>
        {children}
        <Devtools client={queryClient} />
      </MainLayout>
    </TopLevelProvidersForErrors>
  )
}
