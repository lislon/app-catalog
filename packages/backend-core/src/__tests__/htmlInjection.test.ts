import { describe, expect, it } from 'vitest'
import { injectCustomScripts } from '../middleware/htmlInjection'

describe('injectCustomScripts', () => {
  it('should inject single script before </body>', () => {
    const html = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <div id="root"></div>
</body>
</html>`

    const result = injectCustomScripts(html, ['/analytics.js'])

    expect(result).toContain('<script src="/analytics.js"></script>')
    expect(result).toMatch(/<script.*analytics\.js.*<\/script>\s*<\/body>/)
  })

  it('should inject multiple scripts before </body>', () => {
    const html = `<!DOCTYPE html>
<html>
<body>
  <div id="root"></div>
</body>
</html>`

    const result = injectCustomScripts(html, [
      '/analytics.js',
      '/monitoring.js',
    ])

    expect(result).toContain('<script src="/analytics.js"></script>')
    expect(result).toContain('<script src="/monitoring.js"></script>')
    expect(result).toMatch(/analytics\.js.*monitoring\.js.*<\/body>/s)
  })

  it('should return unchanged HTML when no scripts provided', () => {
    const html = `<!DOCTYPE html>
<html>
<body>
  <div id="root"></div>
</body>
</html>`

    expect(injectCustomScripts(html, [])).toBe(html)
    expect(injectCustomScripts(html, [])).toBe(html)
  })

  it('should handle HTML without body tag gracefully', () => {
    const html = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
</html>`

    const result = injectCustomScripts(html, ['/analytics.js'])

    // Should return unchanged if no body tag
    expect(result).toBe(html)
  })
})
