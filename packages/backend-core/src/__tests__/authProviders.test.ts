import { genericOAuth } from 'better-auth/plugins'
import { describe, expect, it } from 'vitest'
import { createAuthRouter } from '../modules/auth/authRouter'
import type { BetterAuth } from '../modules/auth/auth'
import type { AcTrpcContext } from '../server/acTrpcContext'
import { t } from '../server/trpcSetup'

// The sign-in page renders one button per name getProviders returns, so an
// upstream rename of the plugin id or of `options.config` silently leaves users
// with no way to sign in. The real plugin is instantiated here on purpose --
// a hand-written stub of its shape would keep passing through that rename.
function providers(auth: Partial<BetterAuth>) {
  const caller = createAuthRouter(t, auth as BetterAuth).createCaller(
    {} as AcTrpcContext,
  )
  return caller.getProviders()
}

describe('auth getProviders', () => {
  it('lists a provider registered through the generic OAuth plugin', async () => {
    const { providers: names } = await providers({
      options: {
        plugins: [
          genericOAuth({
            config: [
              {
                providerId: 'okta',
                clientId: 'id',
                clientSecret: 'secret',
                discoveryUrl:
                  'https://example.invalid/.well-known/openid-configuration',
              },
            ],
          }),
        ],
      },
    })

    expect(names).toEqual(['okta'])
  })

  it('lists built-in social providers alongside plugin ones', async () => {
    const { providers: names } = await providers({
      options: {
        socialProviders: {
          github: { clientId: 'id', clientSecret: 'secret' },
        },
        plugins: [
          genericOAuth({
            config: [
              {
                providerId: 'okta',
                clientId: 'id',
                clientSecret: 'secret',
                discoveryUrl:
                  'https://example.invalid/.well-known/openid-configuration',
              },
            ],
          }),
        ],
      },
    })

    expect(names).toEqual(['github', 'okta'])
  })
})
