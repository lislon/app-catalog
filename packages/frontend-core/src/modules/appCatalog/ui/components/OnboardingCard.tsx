import { ArrowDown, ArrowRight, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '~/ui/button'
import { Card } from '~/ui/card'

const STORAGE_KEY = 'app-catalog-onboarding-dismissed'

/**
 * First-time user onboarding card showing keyboard navigation instructions.
 * Dismissible and persists preference to localStorage.
 */
export function OnboardingCard() {
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
        <h2 className="text-xl font-bold mb-3">Welcome to App Catalog</h2>
        <p className="text-muted-foreground mb-4">
          Browse and discover applications available to you. Click on any app to
          view details, screenshots, and request access if needed.
        </p>

        <div className="bg-muted/50 rounded-lg p-4">
          <h3 className="font-semibold mb-2 text-sm">⌨️ Keyboard Navigation</h3>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-background border rounded text-xs">
                  <ArrowDown className="h-3 w-3" />
                </kbd>
                <span className="text-muted-foreground">/</span>
                <kbd className="px-2 py-1 bg-background border rounded text-xs">
                  <ArrowRight className="h-3 w-3" />
                </kbd>
              </div>
              <span className="text-muted-foreground">
                Navigate through apps
              </span>
            </div>
            <div className="flex items-center gap-3">
              <kbd className="px-2 py-1 bg-background border rounded text-xs">
                Enter
              </kbd>
              <span className="text-muted-foreground">
                Open app details or launch app
              </span>
            </div>
            <div className="flex items-center gap-3">
              <kbd className="px-2 py-1 bg-background border rounded text-xs">
                Esc
              </kbd>
              <span className="text-muted-foreground">Close app details</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
