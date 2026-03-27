import { frontendViteConfig } from '@igstack/app-catalog-frontend-build-vite'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import type { PluginOption } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'
import packageJson from './package.json'

const config = defineConfig(() => {
  const cfg = frontendViteConfig({
    appRoot: import.meta.dirname,
    pwa: {},
  })

  return {
    ...cfg,
    root: __dirname,
    cacheDir: '../../node_modules/.vite/apps/frontend',

    server: {
      ...cfg.server,
      port: 4000,
      proxy: {
        '/api': {
          target: 'http://localhost:4001',
          changeOrigin: true,
        },
      },
      // Watch external source for HMR (core library development)
      watch: {
        ignored: ['!**/node_modules/@igstack/app-catalog-frontend-core/**'],
      },
    },

    resolve: {
      ...cfg.resolve,
      conditions: ['my-custom-condition'],
      // Resolve to source files for HMR in development
      alias: {
        '@igstack/app-catalog-frontend-core': fileURLToPath(
          new URL('../../packages/frontend-core/src/index.tsx', import.meta.url),
        ),
        '@igstack/app-catalog-shared-core': fileURLToPath(
          new URL('../../packages/shared-core/src/index.ts', import.meta.url),
        ),
        '~': fileURLToPath(
          new URL('../../packages/frontend-core/src', import.meta.url),
        ),
      },
    },

    build: {
      outDir: '../../dist/apps/frontend-example',
      emptyOutDir: true,
      reportCompressedSize: true,
      sourcemap: true,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },

    plugins: [
      tailwindcss(),
      ...(cfg.plugins as PluginOption[]),
      tsconfigPaths(),
    ],
    test: {
      name: packageJson.name,
      dir: './src/__tests__',
      watch: false,
      environment: 'jsdom',
      typecheck: { enabled: true },
    },
  }
})

export default config
