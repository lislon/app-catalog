/**
 * Injects custom script tags into HTML content.
 *
 * Inserts script tags at the end of the body tag (before </body>).
 * This is useful for analytics, monitoring, or other third-party scripts.
 *
 * @param html - The HTML content to modify
 * @param scriptUrls - Array of script URLs to inject
 * @returns Modified HTML with injected scripts
 */
export function injectCustomScripts(
  html: string,
  scriptUrls: string[],
): string {
  if (scriptUrls.length === 0) {
    return html
  }

  const scriptTags = scriptUrls
    .map((url) => `    <script src="${url}"></script>`)
    .join('\n')

  // Insert scripts before the closing </body> tag
  return html.replace('</body>', `${scriptTags}\n  </body>`)
}
