import { createHash, randomUUID } from 'node:crypto'
import { getCookie } from '../../utils/cookies'

/** Opaque per-browser token. httpOnly, so page scripts cannot read or forge it. */
export const VISITOR_COOKIE = 'ac_cid'

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000

/**
 * Who the server thinks is commenting.
 *
 * The catalog is browsable without logging in, so there is no session to hang a
 * comment on. `hash` is the only thing that authorises editing or deleting a
 * comment later, and `alias` is the only name a reader ever sees.
 */
export interface Visitor {
  hash: string
  alias: string
}

const ADJECTIVES = [
  'Ancient',
  'Brave',
  'Calm',
  'Clever',
  'Curious',
  'Eager',
  'Gentle',
  'Happy',
  'Honest',
  'Humble',
  'Jolly',
  'Keen',
  'Kind',
  'Lively',
  'Loyal',
  'Merry',
  'Mighty',
  'Modest',
  'Noble',
  'Patient',
  'Polite',
  'Proud',
  'Quiet',
  'Rapid',
  'Silent',
  'Smooth',
  'Steady',
  'Subtle',
  'Sunny',
  'Swift',
  'Tidy',
  'Witty',
]

const ANIMALS = [
  'Badger',
  'Beaver',
  'Bison',
  'Crane',
  'Dolphin',
  'Falcon',
  'Ferret',
  'Finch',
  'Fox',
  'Gecko',
  'Heron',
  'Ibex',
  'Jackal',
  'Kestrel',
  'Lemur',
  'Lynx',
  'Magpie',
  'Marten',
  'Mole',
  'Narwhal',
  'Ocelot',
  'Osprey',
  'Otter',
  'Panda',
  'Puffin',
  'Raven',
  'Seal',
  'Shrew',
  'Stoat',
  'Tapir',
  'Vole',
  'Walrus',
]

/**
 * A stable, readable name for a visitor hash, e.g. "Curious Ferret".
 *
 * Deterministic, so the same browser keeps the same name across comments — but it
 * is derived once and stored on the row, because widening these lists later would
 * otherwise rename every comment ever written.
 */
export function aliasForHash(hash: string): string {
  // Two independent slices of the hash, so the two words vary independently.
  const adjective =
    ADJECTIVES[parseInt(hash.slice(0, 8), 16) % ADJECTIVES.length]
  const animal = ANIMALS[parseInt(hash.slice(8, 16), 16) % ANIMALS.length]
  return `${adjective} ${animal}`
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Read the visitor token, issuing one when this browser has none yet.
 *
 * Called on every tRPC request rather than only when commenting: the cookie has to
 * already exist by the time someone clicks Post, and issuing it on the read that
 * renders the comment list is the one moment we know a page is open.
 *
 * `res` is absent on internally-created contexts (see createAcMiddleware), and
 * those never comment — they get an identity derived from the token they carry, if
 * any, and cannot be issued a new one.
 */
export function resolveVisitor(
  req: { headers: { cookie?: string } },
  res?: {
    cookie: (
      name: string,
      value: string,
      options: Record<string, unknown>,
    ) => unknown
  },
): Visitor | null {
  let token = getCookie(req, VISITOR_COOKIE)

  if (!token) {
    if (!res) return null
    token = randomUUID()
    res.cookie(VISITOR_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: ONE_YEAR_MS,
    })
  }

  const hash = hashToken(token)
  return { hash, alias: aliasForHash(hash) }
}
