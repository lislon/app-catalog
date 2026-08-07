// Deterministic crayon-palette monogram color for an app that has no icon.
// Mirrors the prototype's flat brand-color chips (option-a-launcher.html):
// a small warm palette drawn from the logo, picked stably by slug so the same
// app always gets the same color.

const CRAYON_PALETTE = [
  '#dc6827', // orange
  '#eca832', // amber
  '#e4724a', // coral
  '#f07a84', // pink
  '#3782c2', // blue
  '#388aca', // blue-2
  '#65a443', // green
  '#2c2622', // ink
]

/** Stable hash → palette index, so a given slug always maps to one color. */
export function monogramColor(key: string): string {
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0
  }
  const idx = Math.abs(hash) % CRAYON_PALETTE.length
  return CRAYON_PALETTE[idx] as string
}

/** Up-to-2-char initials from a display name / abbreviation. */
export function monogramInitials(name: string, abbreviation?: string): string {
  const base = (abbreviation || name).trim()
  if (!base) return '?'
  // If an abbreviation is given, use its first 2 chars verbatim (e.g. "K8", "EH").
  if (abbreviation) return abbreviation.slice(0, 2).toUpperCase()
  const words = base
    .replace(/[^A-Za-z0-9 ]/g, '')
    .split(/\s+/)
    .filter(Boolean)
  if (words.length >= 2) {
    return (words[0]![0]! + words[1]![0]!).toUpperCase()
  }
  return base.slice(0, 2).toUpperCase()
}
