import type { Resource } from '@igstack/app-catalog-backend-core'
import type { CommunityTag } from '@igstack/app-catalog-shared-core'
import { TAG_VALUE_MAX } from '@igstack/app-catalog-shared-core'
import { AppWindow, Hash } from 'lucide-react'
import { SuggestInput } from './OwnerPicker'
import { tagKey } from './TagRow'

const MAX_TAGS = 8
const MAX_SUGGESTIONS = 6

/** A topic the way the next person will type it: `Plate Maps` is `plate-maps`. */
export function normalizeTopic(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, '-')
}

/**
 * App tags, picked from the catalog's own apps so they always resolve, and
 * topic words, suggested from the tags already in use so they converge. One
 * box offers both; Enter on text nothing matches adds it as a new topic.
 */
export function TagPicker({
  id,
  apps,
  knownTopics,
  value,
  onChange,
  onTooLong,
  describedBy,
  disabled,
}: {
  id: string
  /** The official apps (no sub-resources). */
  apps: Resource[]
  /** Every topic some tool already carries. */
  knownTopics: string[]
  value: CommunityTag[]
  onChange: (tags: CommunityTag[]) => void
  /** A typed topic over the length cap; the form says so next to the field. */
  onTooLong: () => void
  describedBy?: string
  disabled?: boolean
}) {
  const appName = (slug: string) =>
    apps.find((a) => a.slug === slug)?.displayName ?? slug
  const has = (tag: CommunityTag) =>
    value.some((t) => tagKey(t) === tagKey(tag))
  const add = (tag: CommunityTag) => {
    if (!has(tag)) onChange([...value, tag])
  }

  return (
    <SuggestInput
      id={id}
      chips={value.map((tag) => ({
        key: tagKey(tag),
        label: tag.kind === 'app' ? appName(tag.value) : tag.value,
        icon:
          tag.kind === 'app' ? (
            <AppWindow aria-hidden="true" className="ml-1 size-3.5" />
          ) : (
            <Hash aria-hidden="true" className="ml-1 size-3.5" />
          ),
      }))}
      onRemove={(key) => onChange(value.filter((t) => tagKey(t) !== key))}
      placeholder={
        value.length >= MAX_TAGS
          ? 'Eight tags at most'
          : 'An app it is for, or a topic word'
      }
      atLimit={value.length >= MAX_TAGS}
      disabled={disabled}
      describedBy={describedBy}
      suggest={(query) => {
        const q = query.toLowerCase()
        const topic = normalizeTopic(query)
        const appOptions = apps
          .filter(
            (a) =>
              a.displayName.toLowerCase().includes(q) ||
              a.abbreviation?.toLowerCase().includes(q),
          )
          .filter((a) => !has({ kind: 'app', value: a.slug }))
          .slice(0, MAX_SUGGESTIONS)
          .map((a) => ({
            key: `app:${a.slug}`,
            label: a.displayName,
            sub: a.abbreviation ? `App · ${a.abbreviation}` : 'App',
            icon: <AppWindow aria-hidden="true" className="size-4" />,
          }))
        const topicOptions = knownTopics
          .filter((t) => t.includes(topic))
          .filter((t) => !has({ kind: 'topic', value: t }))
          .slice(0, MAX_SUGGESTIONS)
          .map((t) => ({
            key: `topic:${t}`,
            label: t,
            sub: 'Topic in use',
            icon: <Hash aria-hidden="true" className="size-4" />,
          }))
        return [...appOptions, ...topicOptions]
      }}
      onPick={(key) => {
        const [kind, ...rest] = key.split(':')
        add({ kind: kind as CommunityTag['kind'], value: rest.join(':') })
      }}
      onEnterText={(text) => {
        const topic = normalizeTopic(text)
        if (!topic) return false
        if (topic.length > TAG_VALUE_MAX) {
          onTooLong()
          return false
        }
        add({ kind: 'topic', value: topic })
        return true
      }}
    />
  )
}
