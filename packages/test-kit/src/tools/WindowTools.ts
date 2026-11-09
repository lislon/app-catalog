import { externalLink } from '@igstack/app-catalog-frontend-core/internal'

const opened: string[] = []

/**
 * Records every URL the app hands to another app (`vscode://`, `cursor://`)
 * instead of navigating, which jsdom cannot do. The setup file installs it
 * before each test.
 */
export function interceptExternalLinks(): void {
  opened.length = 0
  externalLink.open = (url) => {
    opened.push(url)
  }
}

export class WindowTools {
  /** The last URL the page tried to open in another app, if any. */
  lastExternalUrl(): string | undefined {
    return opened.at(-1)
  }
}
