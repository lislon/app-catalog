import type { Person } from '@igstack/app-catalog-backend-core'
import { Search, X } from 'lucide-react'
import { useId, useState } from 'react'
import { cn } from '~/lib/utils'
import { highlightMatches } from '~/util/highlightMatches'
import { PersonAvatar } from './FeedRow'

export const FIELD_BOX =
  'flex min-h-10 w-full items-center gap-2 rounded-[10px] border border-border bg-card px-3 text-sm transition-[box-shadow,border-color] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30'

export const FIELD_BAD =
  'border-destructive ring-[3px] ring-destructive/15 focus-within:border-destructive focus-within:ring-destructive/15'

export interface SuggestChip {
  key: string
  label: string
  icon?: React.ReactNode
}

export interface SuggestOption {
  key: string
  label: string
  sub?: string
  icon?: React.ReactNode
}

/**
 * Chips with a text box that suggests what to add. ↑↓ move through the
 * suggestions, Enter adds one (or hands the typed text to `onEnterText`),
 * Backspace in an empty box takes the last chip off, Esc closes the list.
 */
export function SuggestInput({
  id,
  chips,
  onRemove,
  placeholder,
  suggest,
  onPick,
  onEnterText,
  invalid,
  describedBy,
  disabled,
  atLimit,
}: {
  id: string
  chips: SuggestChip[]
  onRemove: (key: string) => void
  placeholder: string
  /** What to offer for the text typed so far. */
  suggest: (query: string) => SuggestOption[]
  onPick: (key: string) => void
  /** Enter with no suggestion chosen; return true when the text was used. */
  onEnterText?: (text: string) => boolean
  invalid?: boolean
  describedBy?: string
  disabled?: boolean
  /** Nothing more can be added; chips can still come off. */
  atLimit?: boolean
}) {
  const listId = useId()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)
  const options = query.trim() ? suggest(query.trim()) : []
  const shown = open && options.length > 0
  const activeIndex = Math.min(active, options.length - 1)
  const optionId = (i: number) => `${listId}-${i}`

  const pick = (key: string) => {
    onPick(key)
    setQuery('')
    setActive(0)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      // After Esc the list is shut; an arrow brings it back.
      if (!shown) {
        setOpen(true)
        return
      }
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive(Math.min(options.length - 1, Math.max(0, activeIndex + step)))
    } else if (e.key === 'Enter') {
      // Never submits the form: Enter here means "add this".
      e.preventDefault()
      const option = shown ? options[activeIndex] : undefined
      if (option) pick(option.key)
      else if (query.trim() && onEnterText?.(query)) setQuery('')
    } else if (e.key === 'Backspace' && !query && chips.length > 0) {
      onRemove(chips[chips.length - 1]!.key)
    } else if (e.key === 'Escape' && shown) {
      // The dialog leaves an open list's Escape to it (see ToolFormDialog).
      e.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <div
        className={cn(
          FIELD_BOX,
          'flex-wrap gap-1.5 px-2 py-[5px]',
          invalid && FIELD_BAD,
        )}
      >
        {chips.map((chip) => (
          <span
            key={chip.key}
            data-testid="picker-chip"
            className="inline-flex h-7 items-center gap-1.5 rounded-full bg-secondary pr-1 pl-[3px] text-[13px] font-semibold"
          >
            {chip.icon}
            <span data-testid="picker-chip-label">{chip.label}</span>
            <button
              type="button"
              aria-label={`Remove ${chip.label}`}
              disabled={disabled}
              onClick={() => onRemove(chip.key)}
              className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              <X aria-hidden="true" className="size-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={shown}
          aria-controls={shown ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={shown ? optionId(activeIndex) : undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          disabled={disabled || atLimit}
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className="h-7 min-w-32 flex-1 bg-transparent px-1 outline-none placeholder:text-muted-foreground"
        />
        <Search
          aria-hidden="true"
          className="size-4 text-muted-foreground/70"
        />
      </div>
      {shown && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-10 mt-0.5 flex flex-col rounded-[10px] border border-border bg-card p-1 shadow-lg"
        >
          {options.map((option, i) => (
            <li
              key={option.key}
              id={optionId(i)}
              role="option"
              aria-selected={i === activeIndex}
              // Keeps the caret in the box, so the next one can be typed at once.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(option.key)}
              onMouseEnter={() => setActive(i)}
              className={cn(
                'flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-[7px] text-[13.5px]',
                i === activeIndex && 'bg-accent',
              )}
            >
              {option.icon}
              <span className="flex flex-col leading-tight">
                <b className="font-semibold">
                  {highlightMatches(option.label, query.trim())}
                </b>
                {option.sub && (
                  <span className="text-xs text-muted-foreground">
                    {option.sub}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function personName(person: Person): string {
  return `${person.firstName} ${person.lastName}`.trim() || person.slug
}

const MAX_OWNERS = 5
const MAX_SUGGESTIONS = 6

/** Owners from the person directory: search by name or email, chips, remove. */
export function OwnerPicker({
  id,
  persons,
  value,
  onChange,
  invalid,
  describedBy,
  disabled,
}: {
  id: string
  persons: Person[]
  /** Person slugs, in the order they were added. */
  value: string[]
  onChange: (slugs: string[]) => void
  invalid?: boolean
  describedBy?: string
  disabled?: boolean
}) {
  const nameOf = (slug: string) => {
    const person = persons.find((p) => p.slug === slug)
    return person ? personName(person) : slug
  }
  const full = value.length >= MAX_OWNERS

  return (
    <SuggestInput
      id={id}
      chips={value.map((slug) => ({
        key: slug,
        label: nameOf(slug),
        icon: <PersonAvatar name={nameOf(slug)} />,
      }))}
      onRemove={(slug) => onChange(value.filter((s) => s !== slug))}
      placeholder={full ? 'Five owners at most' : 'Add a person'}
      disabled={disabled}
      atLimit={full}
      invalid={invalid}
      describedBy={describedBy}
      suggest={(query) => {
        const words = query.toLowerCase().split(/\s+/)
        return persons
          .filter((p) => !value.includes(p.slug))
          .filter((p) => {
            const text = `${personName(p)} ${p.email ?? p.slug}`.toLowerCase()
            return words.every((w) => text.includes(w))
          })
          .slice(0, MAX_SUGGESTIONS)
          .map((p) => ({
            key: p.slug,
            label: personName(p),
            sub: p.email ?? p.slug,
            icon: <PersonAvatar name={personName(p)} />,
          }))
      }}
      onPick={(slug) => onChange([...value, slug])}
    />
  )
}
