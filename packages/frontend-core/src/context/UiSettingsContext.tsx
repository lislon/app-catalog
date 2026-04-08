import { createContext, use } from 'react'
import type { ReactNode } from 'react'
import type { UiSettings } from '~/types/uiSettings'

const UiSettingsInternalContext = createContext<UiSettings | undefined>(
  undefined,
)

interface UiSettingsContextProps {
  children: ReactNode
  value?: UiSettings
}

export function UiSettingsContext({ children, value }: UiSettingsContextProps) {
  return (
    <UiSettingsInternalContext value={value}>
      {children}
    </UiSettingsInternalContext>
  )
}

export function useUiSettings(): UiSettings {
  const context = use(UiSettingsInternalContext)
  return context ?? {}
}
