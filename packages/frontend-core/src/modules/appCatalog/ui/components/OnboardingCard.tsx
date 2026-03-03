import { ArrowDown, ArrowUp, X } from 'lucide-react'
import {  useEffect, useState } from 'react'
import type {ReactNode} from 'react';
import { Button } from '~/ui/button'
import { Card } from '~/ui/card'

const STORAGE_KEY = 'app-catalog-onboarding-dismissed'

export interface OnboardingCardProps {
  /** Main heading text */
  title?: ReactNode
  /** Description text below the title */
  description?: ReactNode
}

/**
 * First-time user onboarding card showing keyboard navigation instructions.
 * Dismissible and persists preference to localStorage.
 */
export function OnboardingCard({
  title = 'Welcome to App Catalog',
  description = 'Browse and discover applications available to you. Click on any app to view details, screenshots, and request access if needed.',
}: OnboardingCardProps = {}) {
  const [isDismissed, setIsDismissed] = useState(true) // Default to dismissed during hydration

  useEffect(() => {
    // Check localStorage after mount
    const dismissed = localStorage.getItem(STORAGE_KEY)
    setIsDismissed(dismissed === 'true')
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setIsDismissed(true)
  }

  if (isDismissed) {
    return null
  }

  return (
    <Card className="p-6 mb-4 relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2"
        onClick={handleDismiss}
        aria-label="Dismiss onboarding"
      >
        <X className="h-4 w-4" />
      </Button>

      <div className="pr-10">
        <h2 className="text-xl font-bold mb-3">{title}</h2>
        <p className="text-muted-foreground mb-4">{description}</p>

        <div className="bg-muted/50 rounded-lg p-4">
          <h3 className="font-semibold mb-2 text-sm">⌨️ Keyboard Navigation</h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-background border rounded text-xs flex items-center">
                  <ArrowUp className="h-3 w-3" />
                </kbd>
                <span className="text-muted-foreground">/</span>
                <kbd className="px-2 py-1 bg-background border rounded text-xs flex items-center">
                  <ArrowDown className="h-3 w-3" />
                </kbd>
              </div>
              <span className="text-muted-foreground">Navigate apps</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-background border rounded text-xs">
                Enter
              </kbd>
              <span className="text-muted-foreground">Open screenshots</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-background border rounded text-xs">
                Esc
              </kbd>
              <span className="text-muted-foreground">Close details</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
