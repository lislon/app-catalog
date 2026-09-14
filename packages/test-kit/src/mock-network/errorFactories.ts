import { HttpResponse, http } from 'msw'
import type { RequestHandler } from 'msw'

/**
 * Simulates a network-level connection reset error.
 * This is what happens when the backend is completely unreachable.
 */
export function makeConnectionResetError(): RequestHandler {
  return http.get(/\/api\/trpc\/appCatalog\.getData/, () => {
    return HttpResponse.error()
  })
}

/**
 * Simulates a reverse proxy returning HTML instead of JSON
 * (e.g., nginx 502 Bad Gateway page).
 */
export function makeHtmlResponseError(): RequestHandler {
  return http.get(/\/api\/trpc\/appCatalog\.getData/, () => {
    return new HttpResponse(
      '<html><head><title>502 Bad Gateway</title></head><body><h1>502 Bad Gateway</h1><p>The server is temporarily unable to service your request.</p></body></html>',
      {
        status: 502,
        headers: { 'Content-Type': 'text/html' },
      },
    )
  })
}
