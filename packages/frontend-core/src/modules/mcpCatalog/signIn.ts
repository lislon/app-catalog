import type { McpServer } from '@igstack/app-catalog-shared-core'
import { KeyRound, LockOpen, ShieldCheck } from 'lucide-react'

/** How a server signs you in: its icon, short badge text and the full sentence. */
export const SIGN_IN: Record<
  McpServer['auth']['kind'],
  { Icon: typeof KeyRound; badge: string; tip: string }
> = {
  sso: {
    Icon: ShieldCheck,
    badge: 'SSO',
    tip: 'Sign-in: single sign-on. A browser window opens once',
  },
  token: {
    Icon: KeyRound,
    badge: 'Personal token',
    tip: 'Sign-in: your personal token, pasted once',
  },
  none: { Icon: LockOpen, badge: 'No sign-in', tip: 'No sign-in needed' },
}

/** Beta and personal servers say so; production goes unmarked. */
export const STATUS_CHIP: Partial<
  Record<McpServer['status'], { label: string; className: string }>
> = {
  beta: {
    label: 'Beta',
    className: 'bg-amber-500/20 text-amber-800 dark:text-amber-300',
  },
  personal: {
    label: 'Personal',
    className: 'bg-sky-500/15 text-sky-800 dark:text-sky-300',
  },
}
