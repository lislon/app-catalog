import type { AcDevMockUser } from '../../middleware/types'
import type { User } from 'better-auth/types'

/**
 * Creates a complete User object from basic dev mock user details
 */
export function createMockUserFromDevConfig(devUser: AcDevMockUser): User {
  return {
    id: devUser.id,
    email: devUser.email,
    name: devUser.name,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

/**
 * Creates a mock session response for /api/auth/session endpoint
 */
export function createMockSessionResponse(devUser: AcDevMockUser) {
  return {
    user: {
      id: devUser.id,
      email: devUser.email,
      name: devUser.name,
      emailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    session: {
      id: `${devUser.id}-session`,
      userId: devUser.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(), // 30 days
      token: `${devUser.id}-token`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    isAdmin: true, // dev mock user is always admin
  }
}
