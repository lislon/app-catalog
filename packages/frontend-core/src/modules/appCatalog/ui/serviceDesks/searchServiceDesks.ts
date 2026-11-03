import type {
  AppApprovalMethod,
  ServicePortal,
  ServiceRequestField,
  ServiceRequestType,
} from '@igstack/app-catalog-backend-core'
import { cyrillicLayoutToLatin } from '@igstack/app-catalog-shared-core'

export type ServiceDesk = Extract<AppApprovalMethod, { type: 'service' }>

/** A desk that publishes forms. Desks without a portal are links only. */
export type PortalDesk = ServiceDesk & {
  config: ServiceDesk['config'] & { portal: ServicePortal }
}

export function hasPortal(desk: ServiceDesk): desk is PortalDesk {
  return Boolean(desk.config.portal)
}

/** A dropdown on the form whose options include what was searched for. */
export interface FieldMatch {
  field: ServiceRequestField
  matched: string[]
}

export interface FormResult {
  desk: PortalDesk
  form: ServiceRequestType
  fieldMatches: FieldMatch[]
}

/**
 * Where the query hit, strongest first. A key or name hit means the person asked
 * for the desk itself, so every one of its forms is a result.
 */
const TIER = {
  keyExact: 6,
  keyPrefix: 5,
  deskName: 4,
  text: 3,
  field: 2,
} as const

const terms = (query: string) =>
  query.trim().toLowerCase().split(/\s+/).filter(Boolean)

/** Every term appears somewhere in `text`, in any order. */
export function containsAll(text: string | undefined, query: string): boolean {
  if (!text) return false
  const haystack = text.toLowerCase()
  const t = terms(query)
  return t.length > 0 && t.every((term) => haystack.includes(term))
}

/**
 * The query, reread when it finds nothing as typed and contains Cyrillic:
 * first as the keyboard layout (`щквукы` was meant as `orders`), then as a
 * phonetic transliteration (`ордерс` sounds like `orders`).
 */
export function effectiveQuery(
  query: string,
  findsSomething: (q: string) => boolean,
): string {
  if (!query.trim() || !/[а-яё]/i.test(query) || findsSomething(query)) {
    return query
  }
  for (const reread of [cyrillicLayoutToLatin(query), transliterate(query)]) {
    if (reread !== query && findsSomething(reread)) return reread
  }
  return query
}

const PHONETIC: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
}

function transliterate(query: string): string {
  return Array.from(query)
    .map((char) => PHONETIC[char.toLowerCase()] ?? char)
    .join('')
}

/**
 * Options a desk marks as somebody else's ("Billing DB - HELP doesn't handle").
 * They are dead ends, so they never count as a match and are not listed.
 */
export const NOT_HANDLED = /doesn.?t handle|not handled|^invalid$/i

export const liveOptions = (field: ServiceRequestField) =>
  (field.options ?? []).filter((o) => !NOT_HANDLED.test(o)).map((o) => o.trim())

function fieldMatches(form: ServiceRequestType, query: string): FieldMatch[] {
  return form.fields.flatMap((field) => {
    const matched = liveOptions(field).filter((o) => containsAll(o, query))
    return matched.length ? [{ field, matched }] : []
  })
}

function tierOf(desk: PortalDesk, query: string): number {
  const key = desk.config.portal.key.toLowerCase()
  const q = query.trim().toLowerCase()
  if (key === q) return TIER.keyExact
  if (q.length >= 2 && key.startsWith(q)) return TIER.keyPrefix
  if (containsAll(desk.displayName, query)) return TIER.deskName
  return 0
}

/** Forms matching `query`, best first; empty for an empty query. */
export function searchServiceDesks(
  desks: PortalDesk[],
  query: string,
): FormResult[] {
  if (!terms(query).length) return []
  const ranked: { result: FormResult; tier: number; order: number }[] = []
  desks.forEach((desk, deskIndex) => {
    const deskTier = tierOf(desk, query)
    const deskText = containsAll(desk.config.description, query)
    desk.config.portal.requestTypes.forEach((form, formIndex) => {
      const matches = fieldMatches(form, query)
      const text =
        deskText ||
        containsAll(form.name, query) ||
        containsAll(form.description, query)
      const tier =
        deskTier || (text ? TIER.text : matches.length ? TIER.field : 0)
      if (!tier) return
      ranked.push({
        result: { desk, form, fieldMatches: matches },
        tier,
        // Inside a tier, more matched options first, then source order.
        order:
          -matches.reduce((n, m) => n + m.matched.length, 0) * 1000 +
          deskIndex * 100 +
          formIndex,
      })
    })
  })
  return ranked
    .sort((a, b) => b.tier - a.tier || a.order - b.order)
    .map((r) => r.result)
}

/**
 * A form's address in the Service Desks view: the desk's key and the form's id,
 * `/service-desks/help-42`. The id, not the name, so a renamed form keeps its
 * links; the key, so the address still says which desk it belongs to.
 */
export function formSlug(desk: PortalDesk, form: ServiceRequestType): string {
  return `${desk.config.portal.key.toLowerCase()}-${form.id}`
}

/** The desk and form behind a `formSlug`, or undefined. */
export function findBySlug(
  desks: PortalDesk[],
  slug: string,
): { desk: PortalDesk; form: ServiceRequestType } | undefined {
  for (const desk of desks) {
    const key = `${desk.config.portal.key.toLowerCase()}-`
    if (!slug.startsWith(key)) continue
    const form = desk.config.portal.requestTypes.find(
      (f) => f.id === slug.slice(key.length),
    )
    if (form) return { desk, form }
  }
  return undefined
}

/** Every form of every desk, unmatched: the Service Desks view with no search. */
export function allForms(desks: PortalDesk[]): FormResult[] {
  return desks.flatMap((desk) =>
    desk.config.portal.requestTypes.map((form) => ({
      desk,
      form,
      fieldMatches: [],
    })),
  )
}
