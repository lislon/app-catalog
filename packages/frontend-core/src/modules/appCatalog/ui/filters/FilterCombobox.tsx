import { Check, ChevronsUpDown, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '~/lib/utils'
import { Button } from '~/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '~/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '~/ui/popover'
import type { TagOption } from '../context/AppCatalogFiltersContext'

interface FilterComboboxProps {
  /** Filter prefix (e.g., "category") */
  prefix: string
  /** Display label for the filter */
  label: string
  /** Available options */
  options: Array<TagOption>
  /** Currently selected value */
  value: string | undefined
  /** Callback when value changes */
  onValueChange: (value: string | undefined) => void
}

/**
 * Searchable combobox for selecting a tag filter value.
 * Shows a clear button (X) when a value is selected.
 */
export function FilterCombobox({
  label,
  options,
  value,
  onValueChange,
}: FilterComboboxProps) {
  const [open, setOpen] = useState(false)

  const selectedOption = options.find((opt) => opt.value === value)

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="min-w-[180px] justify-between"
          >
            {selectedOption ? (
              <span className="truncate">{selectedOption.displayName}</span>
            ) : (
              <span className="text-muted-foreground">{label}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-0">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
            <CommandList>
              <CommandEmpty>No options found.</CommandEmpty>
              <CommandGroup>
                {/* Clear/Reset option */}
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onValueChange(undefined)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      !value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="text-muted-foreground">All</span>
                </CommandItem>

                {/* Regular options */}
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.displayName}
                    onSelect={() => {
                      onValueChange(option.value)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === option.value ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{option.displayName}</span>
                      {option.description && (
                        <span className="text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Clear button (only shown when value is selected) */}
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onValueChange(undefined)}
          aria-label={`Clear ${label}`}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
