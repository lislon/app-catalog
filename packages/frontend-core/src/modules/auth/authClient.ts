import { createAuthClient } from 'better-auth/react'
import { genericOAuthClient } from 'better-auth/client/plugins'

/**
 * Better Auth client for frontend authentication
 * Automatically handles session management and cookies
 * genericOAuthClient enables signIn.social() for generic OAuth providers (e.g. Okta)
 */
export const authClient = createAuthClient({
  baseURL: window.location.origin,
  plugins: [genericOAuthClient()],
})
