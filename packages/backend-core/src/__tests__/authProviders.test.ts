import { betterAuth } from 'better-auth'
import { memoryAdapter } from 'better-auth/adapters/memory'
import { genericOAuth } from 'better-auth/plugins'
import { describe, expect, it } from 'vitest'
import { createAuthRouter } from '../modules/auth/authRouter'
import type { BetterAuth } from '../modules/auth/auth'
import type { AcTrpcContext } from '../server/acTrpcContext'
import { t } from '../server/trpcSetup'

// The sign-in page renders one button per name getProviders returns, so an
// upstream rename of the plugin id or of `options.config` silently leaves users
// with no way to sign in. A real betterAuth instance is built here on purpose --
// a hand-written stub of the auth context would keep passing through that
// rename, and would not run the plugin's own init, which is where the provider
// list is actually decided.
function auth(options: Record<string, unknown>): BetterAuth {
  return betterAuth({
    database: memoryAdapter({}),
    secret: 'test-secret-that-is-long-enough',
    baseURL: 'http://localhost',
    // Provider skips are logged as errors; the skip is the expectation here.
    logger: { disabled: true },
    ...options,
  }) as BetterAuth
}

function providers(instance: BetterAuth) {
  return createAuthRouter(t, instance)
    .createCaller({} as AcTrpcContext)
    .getProviders()
}

// Needs no discovery document, so it resolves without touching the network.
const resolvable = {
  providerId: 'okta',
  clientId: 'id',
  clientSecret: 'secret',
  authorizationUrl: 'https://example.com/oauth2/v1/authorize',
  tokenUrl: 'https://example.com/oauth2/v1/token',
}

// `.invalid` is reserved and unresolvable (RFC 6761), so discovery fails fast
// offline -- which is exactly the transient-outage condition this guards.
const unresolvable = {
  providerId: 'okta',
  clientId: 'id',
  clientSecret: 'secret',
  discoveryUrl: 'https://example.invalid/.well-known/openid-configuration',
}

describe('auth getProviders', () => {
  it('lists a provider registered through the generic OAuth plugin', async () => {
    const { providers: names } = await providers(
      auth({ plugins: [genericOAuth({ config: [resolvable] })] }),
    )

    expect(names).toEqual(['okta'])
  })

  it('lists built-in social providers alongside plugin ones', async () => {
    const { providers: names } = await providers(
      auth({
        socialProviders: { github: { clientId: 'id', clientSecret: 'secret' } },
        plugins: [genericOAuth({ config: [resolvable] })],
      }),
    )

    expect(names).toContain('github')
    expect(names).toContain('okta')
  })

  // better-auth 1.7 resolves OIDC discovery once, in the plugin's init, and
  // skips a provider whose discovery failed. Deriving the list from the static
  // config instead would still offer the button, and clicking it 400s with
  // "Provider not found" for the whole life of that pod.
  it('omits a provider whose discovery failed, and keeps the ones that resolved', async () => {
    const { providers: names } = await providers(
      auth({
        plugins: [
          genericOAuth({
            config: [unresolvable, { ...resolvable, providerId: 'other-idp' }],
          }),
        ],
      }),
    )

    expect(names).toEqual(['other-idp'])
  })
})
