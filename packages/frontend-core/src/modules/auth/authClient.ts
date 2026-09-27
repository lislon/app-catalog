import { createAuthClient } from 'better-auth/react'

/**
 * Better Auth client for frontend authentication
 * Automatically handles session management and cookies
 * Generic OAuth providers (e.g. Okta) go through signIn.social(), same as the
 * built-in social providers -- no client plugin needed since better-auth 1.7
 */
export const authClient = createAuthClient({
  baseURL: window.location.origin,
})
