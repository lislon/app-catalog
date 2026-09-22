// @vitest-environment node
// The plugin factory pulls in esbuild, whose TextEncoder invariant fails under jsdom.
import { describe, expect, it } from 'vitest'
import { frontendViteConfig } from '@igstack/app-catalog-frontend-build-vite'

/**
 * `VitePWA()` returns an ARRAY of plugins, so an app that tries to drop it by
 * filtering the returned plugin list on `plugin.name` never matches anything
 * and ends up building two service workers and two web manifests over the same
 * paths. `pwa.enabled: false` is the supported way for an app with its own
 * VitePWA to opt out.
 */
function pwaPluginNames(plugins: unknown): string[] {
  if (Array.isArray(plugins)) {
    return plugins.flatMap((plugin) => pwaPluginNames(plugin))
  }
  if (plugins && typeof plugins === 'object' && 'name' in plugins) {
    const { name } = plugins as { name: unknown }
    return typeof name === 'string' && name.includes('pwa') ? [name] : []
  }
  return []
}

describe('frontendViteConfig PWA registration', () => {
  it('registers VitePWA by default', () => {
    expect(pwaPluginNames(frontendViteConfig().plugins).length).toBeGreaterThan(
      0,
    )
  })

  it('registers no PWA plugin when pwa.enabled is false', () => {
    expect(
      pwaPluginNames(frontendViteConfig({ pwa: { enabled: false } }).plugins),
    ).toEqual([])
  })
})
