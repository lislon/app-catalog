import type { Person } from '@igstack/app-catalog-backend-core'
import type { PersonRef } from '@igstack/app-catalog-shared-core'
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
  /** The typed text is exactly this option, so Enter takes it unasked. */
  exact?: boolean
}

/**
 * Chips with a text box that suggests what to add. ↑↓ move through the
 * suggestions, Enter adds one (or hands the typed text to `onEnterText`),
 * Backspace in an empty box takes the last chip off, Esc closes the list.
 * With `textFirst`, nothing is highlighted until an arrow moves onto a
 * suggestion: Enter adds the typed text, or the option it exactly names.
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
  textFirst = false,
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
  textFirst?: boolean
}) {
  const listId = useId()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)
  // An arrow moved the highlight since the text last changed.
  const [moved, setMoved] = useState(false)
  const options = query.trim() ? suggest(query.trim()) : []
  const shown = open && options.length > 0
  const activeIndex =
    textFirst && !moved ? -1 : Math.min(active, options.length - 1)
  const optionId = (i: number) => `${listId}-${i}`

  const pick = (key: string) => {
    onPick(key)
    setQuery('')
    setActive(0)
    setMoved(false)
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
      setMoved(true)
    } else if (e.key === 'Enter') {
      // Never submits the form: Enter here means "add this".
      e.preventDefault()
      const option = !shown
        ? undefined
        : activeIndex >= 0
          ? options[activeIndex]
          : options.find((o) => o.exact)
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
          aria-activedescendant={
            shown && activeIndex >= 0 ? optionId(activeIndex) : undefined
          }
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          disabled={disabled || atLimit}
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
            setMoved(false)
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
                'flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-[7px] text-[13.5px] hover:bg-accent',
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
const OWNER_NAME_MAX = 80
/** The option that adds the typed text as an owner outside the directory. */
const NAMED = 'named:'

function ownerKey(owner: PersonRef): string {
  return owner.slug ?? `${NAMED}${owner.name}`
}

/**
 * Owners from the person directory, searched by name or email, and people it
 * does not know, by name: chips, remove.
 */
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
  /** In the order they were added; `slug` is null outside the directory. */
  value: PersonRef[]
  onChange: (owners: PersonRef[]) => void
  invalid?: boolean
  describedBy?: string
  disabled?: boolean
}) {
  const full = value.length >= MAX_OWNERS
  const taken = new Set(value.map(ownerKey))

  return (
    <SuggestInput
      id={id}
      chips={value.map((owner) => ({
        key: ownerKey(owner),
        label: owner.name,
        icon: <PersonAvatar name={owner.name} />,
      }))}
      onRemove={(key) => onChange(value.filter((o) => ownerKey(o) !== key))}
      placeholder={full ? 'Five owners at most' : 'Add a person'}
      disabled={disabled}
      atLimit={full}
      invalid={invalid}
      describedBy={describedBy}
      suggest={(query) => {
        const words = query.toLowerCase().split(/\s+/)
        const people = persons
          .filter((p) => !taken.has(p.slug))
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
        // Someone the directory does not know is still someone to ask.
        const name = query.trim().slice(0, OWNER_NAME_MAX)
        const known = people.some(
          (p) => p.label.toLowerCase() === name.toLowerCase(),
        )
        if (known || taken.has(`${NAMED}${name}`)) return people
        return [
          ...people,
          {
            key: `${NAMED}${name}`,
            label: `Add “${name}”`,
            sub: 'Not in the people list',
            icon: <PersonAvatar name={name} />,
          },
        ]
      }}
      onPick={(key) => {
        if (key.startsWith(NAMED)) {
          onChange([...value, { slug: null, name: key.slice(NAMED.length) }])
          return
        }
        const person = persons.find((p) => p.slug === key)
        if (person)
          onChange([...value, { slug: key, name: personName(person) }])
      }}
    />
  )
}
