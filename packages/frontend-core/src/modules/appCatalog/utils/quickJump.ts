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
