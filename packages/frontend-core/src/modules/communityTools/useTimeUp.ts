import { useEffect, useState } from 'react'

/**
 * True once `ms` have passed since `key` was first shown, false until then. A
 * new key starts the wait again. The card's cap on waiting for a screenshot.
 */
export function useTimeUp(key: string, ms: number): boolean {
  const [upFor, setUpFor] = useState<string | null>(null)
  useEffect(() => {
    const timer = setTimeout(() => setUpFor(key), ms)
    return () => clearTimeout(timer)
  }, [key, ms])
  return upFor === key
}
