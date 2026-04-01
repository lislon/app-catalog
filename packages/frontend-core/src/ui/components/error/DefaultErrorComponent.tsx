import type { ErrorComponentProps } from '@tanstack/react-router'
import { BugIcon, RefreshCcwIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '~/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '~/ui/empty'
import { useDb } from '~/userDb/DbContext'
import { usePwaAutoUpdate } from '~/modules/pwa'
import { isDexieError, isDexieMigrationError } from '~/util/error-utils'
import { BaseErrorPage } from './BaseErrorPage'

export function Treatment({ error, reset }: ErrorComponentProps) {
  const db = useDb()
  const pwaAutoUpdate = usePwaAutoUpdate()
  const [isResetting, setIsResetting] = useState(false)
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)

  useEffect(() => {
    if (!isDexieError(error) && pwaAutoUpdate) {
      setIsCheckingUpdate(true)
      pwaAutoUpdate.triggerUpdateOnError()
      const timer = setTimeout(() => setIsCheckingUpdate(false), 2000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [error, pwaAutoUpdate])

  async function dexieResetDb() {
    setIsResetting(true)
    try {
      await db.resetDatabase()
      console.log('Database deleted and recreated successfully')
      // Reload the page after successful reset
      window.location.reload()
    } catch (resetError) {
      console.error('Failed to reset database:', resetError)
      // Still reload the page even if reset fails, as it might help
      window.location.reload()
    } finally {
      setIsResetting(false)
    }
  }

  if (isDexieError(error)) {
    const isMigrationError = isDexieMigrationError(error)
    const buttonText = isMigrationError
      ? isResetting
        ? 'Clearing database...'
        : 'Clear database and reload'
      : isResetting
        ? 'Resetting...'
        : 'Try reset local settings'

    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => dexieResetDb()}
        disabled={isResetting}
      >
        <RefreshCcwIcon className={isResetting ? 'animate-spin' : ''} />
        {buttonText}
      </Button>
    )
  }

  if (isCheckingUpdate) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <RefreshCcwIcon className="h-4 w-4 animate-spin" />
        Checking for updates...
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => reset()}>
        <RefreshCcwIcon />
        Try reset error
      </Button>
      {/* <Button
        variant="outline"
        size="sm"
        onClick={() => window.location.reload()}
      >
        <RefreshCcwIcon />
        Try refresh page
      </Button> */}
    </div>
  )
}

export function DefaultErrorComponent({ error, reset }: ErrorComponentProps) {
  return (
    <BaseErrorPage>
      <Empty role="alert">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BugIcon />
          </EmptyMedia>
          <EmptyTitle>Ooops!</EmptyTitle>
          <EmptyDescription>
            Error inside app-catalog occured: {<i>{error.message}</i>}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Treatment error={error} reset={reset} />

          <div
            className={
              'mt-8 text-center max-w-[90vw] max-h-[80vh] overflow-auto'
            }
          >
            <pre className={'text-left mt-8 text-sm'}>
              {<i>{error.stack}</i>}
            </pre>
          </div>
        </EmptyContent>
      </Empty>
    </BaseErrorPage>
  )
}
