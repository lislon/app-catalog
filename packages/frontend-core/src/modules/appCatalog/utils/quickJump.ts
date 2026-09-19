import type { QuickJump, Resource } from '@igstack/app-catalog-backend-core'

/**
 * Build a jump's target url. The whole template "engine": two placeholders,
 * `{{baseHost}}` substituted raw (it is a url prefix) and `{{value}}` encoded
 * exactly once. Returns null when the jump needs a host the resource does not
 * have — the caller drops it instead of rendering a broken link.
 */
export function buildQuickJumpUrl(
  jump: QuickJump,
  value: string,
  appUrl?: string,
): string | null {
  const needsHost = jump.url.includes('{{baseHost}}')
  const host = (appUrl ?? '').replace(/\/+$/, '')
  if (needsHost && !host) return null

  return jump.url
    .replaceAll('{{baseHost}}', host)
    .replaceAll('{{value}}', encodeURIComponent(value.trim()))
}

/**
 * Stable url token for a jump, used as `?qj=<slug>` so a chosen destination is
 * linkable. Derived from the title rather than stored: the em-dash in a title
 * like "Tracker — View case" separates sub-system from action, so it becomes
 * `tracker.view-case`.
 *
 * Two jumps on one app whose titles slugify the same would collide and the
 * second one would not be addressable. Titles have to be distinguishable to a
 * reader anyway, so that is not worth a disambiguation scheme.
 */
export function quickJumpSlug(jump: QuickJump): string {
  return jump.title
    .split(/[—–]/)
    .map((part) =>
      part
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, ''),
    )
    .filter(Boolean)
    .join('.')
}

export interface QuickJumpIdentity {
  /** Human label, e.g. "Case Id" — also the column heading. */
  identity: string
  jumps: QuickJump[]
}

/**
 * Group an app's jumps by identity, keeping first-appearance order (so company
 * config controls the column order) and dropping jumps this app cannot build.
 */
export function groupQuickJumps(app: Resource): QuickJumpIdentity[] {
  const groups: QuickJumpIdentity[] = []

  for (const jump of app.quickJumps ?? []) {
    if (buildQuickJumpUrl(jump, 'probe', app.appUrl) === null) continue

    const group = groups.find((g) => g.identity === jump.identity)
    if (group) group.jumps.push(jump)
    else groups.push({ identity: jump.identity, jumps: [jump] })
  }

  return groups
}

/**
 * Autofill key for an identity's input. Namespaced and derived from the label,
 * so the same identifier autofills from history across apps — the browser gives
 * us per-identity value history for free.
 */
export function quickJumpFieldName(identity: string): string {
  return `qj-${identity
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')}`
}
