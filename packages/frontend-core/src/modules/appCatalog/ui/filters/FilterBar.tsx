import { Button } from '~/ui/button'
import { Card } from '~/ui/card'
import { useAppCatalogFilters } from '../context/AppCatalogFiltersContext'
import { FilterCombobox } from './FilterCombobox'

interface FilterBarProps {
  /** Total number of apps (when no filters active) */
  totalCount: number
  /** Number of apps in "My Recent" */
  recentCount: number
}

/**
 * Horizontal filter bar with All/My Recent toggle and dynamic tag filter comboboxes.
 * Filters are mutually exclusive: Recent clears tag filters, tag filters clear Recent.
 * Only shows if there are recent apps to display.
 */
export function FilterBar({ totalCount, recentCount }: FilterBarProps) {
  const { state, data, actions } = useAppCatalogFilters()

  // Don't show filter bar if no recent apps
  if (recentCount === 0) {
    return null
  }

  return (
    <Card className="p-3">
      <div className="flex items-center gap-3">
        {/* All / My Recent toggle group */}
        <div className="flex items-center rounded-md border">
          <Button
            variant={!state.recentMode ? 'default' : 'ghost'}
            size="sm"
            onClick={() => actions.setRecentMode(false)}
            className="rounded-r-none border-r"
          >
            All ({totalCount})
          </Button>
          <Button
            variant={state.recentMode ? 'default' : 'ghost'}
            size="sm"
            onClick={() => actions.setRecentMode(true)}
            className="rounded-l-none"
          >
            My Recent ({recentCount})
          </Button>
        </div>

        {/* Dynamic tag filter comboboxes */}
        {state.filterableTagPrefixes.map((prefix) => {
          const options = data.availableTagsByPrefix[prefix] || []
          const value = state.tagFilters[prefix]

          // Find the display name for the prefix from tag definitions
          // We'll just capitalize the prefix as a fallback
          const label =
            prefix.charAt(0).toUpperCase() + prefix.slice(1).replace(/-/g, ' ')

          return (
            <FilterCombobox
              key={prefix}
              prefix={prefix}
              label={label}
              options={options}
              value={value}
              onValueChange={(newValue) =>
                actions.setTagFilter(prefix, newValue)
              }
            />
          )
        })}
      </div>
    </Card>
  )
}
