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

/** Who the server thinks is acting, whether or not they ever signed in. */
export type ActorKind = 'user' | 'visitor'

/**
 * One identity for every surface that needs one.
 *
 * `hash` is the secret-derived half: it authorises editing and withdrawing, is stored on
 * rows, and never leaves the server. `publicId` is the half a client may hold — it
 * identifies without authorising, which is what analytics needs and what the httpOnly
 * cookie deliberately cannot give it. Same split better-auth already uses between its
 * session cookie and `user.id`.
 */
export interface Actor {
  hash: string
  publicId: string
  alias: string
  kind: ActorKind
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

/**
 * A non-authorising id derived from the hash.
 *
 * Safe to hand a client: knowing it proves nothing and authorises nothing, because the
 * check is always against the full hash of the cookie the browser actually sent.
 */
export function publicIdFromHash(hash: string): string {
  return hash.slice(0, 16)
}

/**
 * Who is acting, signed in or not.
 *
 * `userId` is passed in rather than looked up, so this stays synchronous and testable in
 * a node environment — the caller already has the session when it builds the request
 * context. When login arrives this starts returning `kind: 'user'` and nothing
 * downstream has to change.
 */
export function resolveActor(
  req: { headers: { cookie?: string } },
  res?: Parameters<typeof resolveVisitor>[1],
  userId?: string | null,
): Actor | null {
  if (userId) {
    return {
      hash: hashToken(`user:${userId}`),
      publicId: publicIdFromHash(hashToken(`user:${userId}`)),
      alias: aliasForHash(hashToken(`user:${userId}`)),
      kind: 'user',
    }
  }
  const visitor = resolveVisitor(req, res)
  if (!visitor) return null
  return {
    hash: visitor.hash,
    publicId: publicIdFromHash(visitor.hash),
    alias: visitor.alias,
    kind: 'visitor',
  }
}

/**
 * A deterministic identity from a seed, for tests and local development.
 *
 * Returns the raw token *and* its hash, so a database fixture and a browser cookie can
 * refer to the same person: seed rows with `hash`, hand the browser `token`. Without
 * this, nothing scoped to one visitor is testable — the cookie is httpOnly on purpose,
 * so page scripts cannot set it.
 */
export function visitorFromSeed(seed: string): {
  token: string
  hash: string
  publicId: string
  alias: string
} {
  const token = createHash('sha256').update(`seed:${seed}`).digest('hex')
  const hash = hashToken(token)
  return {
    token,
    hash,
    publicId: publicIdFromHash(hash),
    alias: aliasForHash(hash),
  }
}
