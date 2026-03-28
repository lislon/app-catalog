import type { RequestHandler } from 'msw'

export interface NetworkInterceptor {
  scopeKey: string[]
  handler: RequestHandler
}

export class NetworkCatalog {
  private interceptors: NetworkInterceptor[] = []

  add(interceptor: NetworkInterceptor): void {
    this.interceptors.push(interceptor)
  }

  replace(scopeKey: string[], handler: RequestHandler): void {
    // Remove existing interceptor with matching key, add new one
    this.interceptors = this.interceptors.filter(
      (i) => !this.keysMatch(i.scopeKey, scopeKey),
    )
    this.interceptors.push({ scopeKey, handler })
  }

  getHandlers(): RequestHandler[] {
    return this.interceptors.map((i) => i.handler)
  }

  private keysMatch(existing: string[], search: string[]): boolean {
    return search.every((k) => existing.includes(k))
  }
}
