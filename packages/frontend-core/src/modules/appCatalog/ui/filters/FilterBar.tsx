import { Button } from '~/ui/button'
import { Input } from '~/ui/input'
import { useAppCatalogFilters } from '../context/AppCatalogFiltersContext'
import { FilterCombobox } from './FilterCombobox'

interface FilterBarProps {
  /** Total number of apps (when no filters active) */
  totalCount: number
  /** Number of apps in "My Recent" */
  recentCount: number
}

/**
 * Horizontal filter bar with All/My Recent toggle, dynamic tag filter comboboxes, and search.
 * Filters are mutually exclusive: Recent clears tag filters, tag filters clear Recent.
 * All discovery controls are grouped together.
 */
export function FilterBar({ totalCount, recentCount }: FilterBarProps) {
  const { state, data, actions } = useAppCatalogFilters()

  return (
    <div className="flex items-center gap-3 mb-4">
      {/* Show All / My Recent toggle group */}
      <div className="flex items-center rounded-md border">
        <Button
          variant={!state.recentMode ? 'default' : 'ghost'}
          size="sm"
          onClick={() => actions.setRecentMode(false)}
          className="rounded-r-none border-r"
        >
          Show All ({totalCount})
        </Button>
        <Button
          variant={state.recentMode ? 'default' : 'ghost'}
          size="sm"
          onClick={() => actions.setRecentMode(true)}
          className="rounded-l-none"
          disabled={recentCount === 0}
        >
          My Recent ({recentCount})
        </Button>
      </div>

      {/* Vertical divider */}
      {state.filterableTagPrefixes.length > 0 && (
        <div className="h-8 w-px bg-border" />
      )}

      {/* Dynamic tag filter comboboxes */}
      {state.filterableTagPrefixes.map((prefix) => {
        const options = data.availableTagsByPrefix[prefix] || []
        const value = state.tagFilters[prefix]

        // Create "Filter By <Name>" label
        const displayName =
          prefix.charAt(0).toUpperCase() + prefix.slice(1).replace(/-/g, ' ')
        const label = `Filter By ${displayName}`

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

      {/* Spacer to push search to the right */}
      <div className="flex-1" />

      {/* Search input */}
      <Input
        value={state.searchValue}
        onChange={(e) => actions.setSearchValue(e.target.value)}
        placeholder="Search apps by name, description, or tags…"
        aria-label="Search apps"
        className="max-w-sm"
      />
    </div>
  )
}
