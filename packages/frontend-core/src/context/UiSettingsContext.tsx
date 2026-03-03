import { createContext, use } from 'react'
import type { ReactNode } from 'react'
import type { UiSettings } from '~/types/uiSettings'

const UiSettingsContextInner = createContext<UiSettings | undefined>(undefined)

interface UiSettingsContextProps {
  children: ReactNode
  value?: UiSettings
}

export function UiSettingsContext({ children, value }: UiSettingsContextProps) {
  return (
    <UiSettingsContextInner value={value}>{children}</UiSettingsContextInner>
  )
}

export function useUiSettings(): UiSettings {
  const context = use(UiSettingsContextInner)
  return context ?? {}
}
