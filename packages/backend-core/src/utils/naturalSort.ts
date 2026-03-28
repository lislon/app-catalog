/**
 * Sorts an array of strings using natural sort order (numeric-aware sorting).
 *
 * Examples:
 * - ['file (1).png', 'file (10).png', 'file (3).png']
 *   → ['file (1).png', 'file (3).png', 'file (10).png']
 * - ['v1', 'v10', 'v2'] → ['v1', 'v2', 'v10']
 *
 * @param items - Array of strings to sort
 * @returns Sorted array (new array, does not mutate original)
 */
export function naturalSort(items: string[]): string[] {
  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base',
  })
  return [...items].sort((a, b) => collator.compare(a, b))
}
