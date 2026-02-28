import { createContext, use } from 'react'
import type { ReactNode } from 'react'
import type { AcDb } from './AcDb'

const DbContext = createContext<AcDb | undefined>(undefined)

interface DbProviderProps {
  children: ReactNode
  db: AcDb
}

export function DbProvider({ children, db }: DbProviderProps) {
  return <DbContext value={db}>{children}</DbContext>
}

export function useDb(): AcDb {
  const context = use(DbContext)
  if (context === undefined) {
    throw new Error('useDb must be used within a DbProvider')
  }
  return context
}
