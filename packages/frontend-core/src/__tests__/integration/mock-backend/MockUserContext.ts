export interface UserConfig {
  name: string
  isAdmin: boolean
  isAuthenticated: boolean
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

  getSessionResponse(): object {
    if (!this.user.isAuthenticated) {
      return {}
    }
    return {
      user: {
        id: 'test-user-id',
        email: `${this.user.name.toLowerCase().replace(/\s/g, '.')}@test.com`,
        name: this.user.name,
        isAdmin: this.user.isAdmin,
      },
      session: {
        id: 'test-session-id',
        userId: 'test-user-id',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      },
    }
  }
}
