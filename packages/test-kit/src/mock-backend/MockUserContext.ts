export interface UserConfig {
  name: string
  /** Defaults to one made from the name. A person-directory slug is an email, so owning a tool means matching it. */
  email?: string
  isAdmin: boolean
  isAuthenticated: boolean
}

/** The signed-in user as the server's tRPC context holds it. */
export interface SessionUser {
  id: string
  email: string
  name: string
  isAdmin: boolean
}

const defaultUser: UserConfig = {
  name: 'Test User',
  isAdmin: false,
  isAuthenticated: true,
}

export class MockUserContext {
  private user: UserConfig = { ...defaultUser }

  setUser(overrides: Partial<UserConfig>): void {
    this.user = { ...this.user, ...overrides }
  }

  getUser(): UserConfig {
    return this.user
  }

  getSessionUser(): SessionUser | null {
    if (!this.user.isAuthenticated) {
      return null
    }
    return {
      id: 'test-user-id',
      email:
        this.user.email ??
        `${this.user.name.toLowerCase().replace(/\s/g, '.')}@test.com`,
      name: this.user.name,
      isAdmin: this.user.isAdmin,
    }
  }

  getSessionResponse(): object | null {
    const user = this.getSessionUser()
    if (!user) {
      return null
    }
    return {
      user,
      session: {
        id: 'test-session-id',
        userId: 'test-user-id',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      },
    }
  }
}
