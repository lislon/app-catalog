import { Clock } from 'lucide-react'
import { Button } from '~/ui/button'
import { useAppCatalogFilters } from '../context/AppCatalogFiltersContext'
import { FilterCombobox } from './FilterCombobox'

/**
 * Horizontal filter bar with "My Recent" toggle and dynamic tag filter comboboxes.
 * Filters are mutually exclusive: Recent clears tag filters, tag filters clear Recent.
 */
export function FilterBar() {
  const { state, data, actions } = useAppCatalogFilters()

  return (
    <div className="flex items-center gap-3 pb-3">
      {/* My Recent toggle button */}
      <Button
        variant={state.recentMode ? 'default' : 'outline'}
        size="sm"
        onClick={() => actions.setRecentMode(!state.recentMode)}
        className="gap-2"
      >
        <Clock className="h-4 w-4" />
        My Recent
      </Button>

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
            onValueChange={(newValue) => actions.setTagFilter(prefix, newValue)}
          />
        )
      })}
    </div>
  )
}
