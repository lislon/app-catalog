/**
 * Leaves the page for a URL another app handles (`vscode://`, `cursor://`).
 * An object rather than a bare function so a test can record the URL: jsdom
 * cannot follow a custom scheme, and `window.location` cannot be stubbed.
 */
export const externalLink = {
  open(url: string): void {
    window.location.href = url
  },
}
