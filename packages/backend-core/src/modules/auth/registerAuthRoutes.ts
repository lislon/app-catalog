import { toNodeHandler } from 'better-auth/node'
import type { Express, Request, Response } from 'express'
import type { Session, User } from 'better-auth/types'
import type { BetterAuth } from './auth'

/**
 * Register Better Auth routes with Express
 * @param app - Express application instance
 * @param auth - Better Auth instance
 * @param isAdmin - Optional callback to determine if user is admin
 */
export function registerAuthRoutes(
  app: Express,
  auth: BetterAuth,
  isAdmin?: (
    user: User,
    session: Session,
    ctx: { request: Request; auth: BetterAuth },
  ) => boolean | Promise<boolean>,
) {
  // Explicit session endpoint handler
  app.get('/api/auth/session', async (req: Request, res: Response) => {
    try {
      const session = await auth.api.getSession({
        headers: req.headers as HeadersInit,
      })
      if (session) {
        let admin = false
        if (isAdmin) {
          try {
            admin = !!(await isAdmin(session.user, session.session, {
              request: req,
              auth,
            }))
          } catch {
            admin = false
          }
        }
        res.json({ ...session, isAdmin: admin })
      } else {
        // Return 200 with null session instead of 401 to avoid
        // browser "Failed to load resource" console errors.
        // The frontend checks for session.user to determine auth state.
        res.json({ session: null, user: null, isAuthenticated: false })
      }
    } catch (error) {
      console.error('[Auth Session Error]', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // Use toNodeHandler to adapt better-auth for Express/Node.js
  const authHandler = toNodeHandler(auth)
  app.all('/api/auth/{*any}', authHandler)
}
