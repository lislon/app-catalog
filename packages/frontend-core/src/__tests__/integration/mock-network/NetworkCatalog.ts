import type { RequestHandler } from 'msw'

export interface NetworkInterceptor {
  scopeKey: Array<string>
  handler: RequestHandler
}

export class NetworkCatalog {
  private interceptors: Array<NetworkInterceptor> = []

  add(interceptor: NetworkInterceptor): void {
    this.interceptors.push(interceptor)
  }

  replace(scopeKey: Array<string>, handler: RequestHandler): void {
    // Remove existing interceptor with matching key, add new one
    this.interceptors = this.interceptors.filter(
      (i) => !this.keysMatch(i.scopeKey, scopeKey),
    )
    this.interceptors.push({ scopeKey, handler })
  }

  getHandlers(): Array<RequestHandler> {
    return this.interceptors.map((i) => i.handler)
  }

  private keysMatch(existing: Array<string>, search: Array<string>): boolean {
    return search.every((k) => existing.includes(k))
  }
}
