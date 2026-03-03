import type { AppForCatalog } from '@igstack/app-catalog-backend-core'
import { X } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '~/ui/button'
import { Checkbox } from '~/ui/checkbox'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '~/ui/input-group'
import { Label } from '~/ui/label'
import { useAppCatalogFilters } from '../context/AppCatalogFiltersContext'
import { FilterCombobox } from './FilterCombobox'

interface FilterBarProps {
  /** Total number of apps (respecting deprecated filter) */
  totalCount: number
  /** Number of apps in "My Recent" */
  recentCount: number
  /** Number of deprecated apps (total) */
  deprecatedCount: number
  /** All apps for counting filter options */
  apps: Array<AppForCatalog>
}

/**
 * Horizontal filter bar with All/My Recent toggle, dynamic tag filter comboboxes, and search.
 * Filters are mutually exclusive: Recent clears tag filters, tag filters clear Recent.
 * All discovery controls are grouped together.
 */
export function FilterBar({
  totalCount,
  recentCount,
  deprecatedCount,
  apps,
}: FilterBarProps) {
  const { state, data, actions } = useAppCatalogFilters()

  // Check if "Show All" mode is truly active (no filters at all)
  const isShowAllActive =
    !state.recentMode && Object.keys(state.tagFilters).length === 0

  // Calculate counts for each filter option (respecting showDeprecated)
  const filterOptionCounts = useMemo(() => {
    const counts: Record<string, Record<string, number>> = {}

    // Filter apps by deprecated setting first
    const baseApps = state.showDeprecated
      ? apps
      : apps.filter((app) => !app.deprecated)

    state.filterableTagPrefixes.forEach((prefix) => {
      const prefixCounts: Record<string, number> = {}
      const options = data.availableTagsByPrefix[prefix] || []

      options.forEach((option) => {
        const fullTag = `${prefix}:${option.value}`
        const count = baseApps.filter((app) =>
          app.tags?.some((tag) => tag.toLowerCase() === fullTag.toLowerCase()),
        ).length
        prefixCounts[option.value] = count
      })

      counts[prefix] = prefixCounts
    })

    return counts
  }, [
    apps,
    state.showDeprecated,
    state.filterableTagPrefixes,
    data.availableTagsByPrefix,
  ])

  return (
    <div className="flex items-center gap-3 mb-4">
      {/* Search input */}
      <InputGroup className="max-w-sm">
        <InputGroupInput
          value={state.searchValue}
          onChange={(e) => actions.setSearchValue(e.target.value)}
          onFocus={(e) => e.target.select()}
          placeholder="Search apps by name, description, or tags…"
          aria-label="Search apps"
        />
        {state.searchValue && (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-xs"
              onClick={() => actions.setSearchValue('')}
              aria-label="Clear search"
            >
              <X />
            </InputGroupButton>
          </InputGroupAddon>
        )}
      </InputGroup>

      {/* Vertical divider */}
      <div className="h-8 w-px bg-border" />

      {/* Show All / My Recent toggle group */}
      <div className="flex items-center rounded-md border">
        <Button
          variant={isShowAllActive ? 'default' : 'ghost'}
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
        const counts = filterOptionCounts[prefix] || {}

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
            counts={counts}
            onValueChange={(newValue) => actions.setTagFilter(prefix, newValue)}
          />
        )
      })}

      {/* Vertical divider before deprecated checkbox */}
      <div className="h-8 w-px bg-border" />

      {/* Show Deprecated Apps checkbox */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="show-deprecated"
          checked={state.showDeprecated}
          onCheckedChange={(checked) =>
            actions.setShowDeprecated(checked === true)
          }
        />
        <Label
          htmlFor="show-deprecated"
          className="text-sm font-normal cursor-pointer"
        >
          Show Deprecated Apps ({deprecatedCount})
        </Label>
      </div>
    </div>
  )
}
