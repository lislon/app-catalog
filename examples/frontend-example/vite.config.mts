import { frontendViteConfig } from '@igstack/app-catalog-frontend-build-vite'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import path from 'node:path'
import type { PluginOption } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import packageJson from './package.json'

const config = defineConfig(({ mode }) => {
  const backendEnvPath = path.resolve(import.meta.dirname, '../backend-example')
  const env = { ...process.env, ...loadEnv(mode, backendEnvPath), ...loadEnv(mode, import.meta.dirname) }

  const frontendPort = Number.parseInt(env.DEV_FRONTEND_PORT || '9500', 10)
  const backendPort = Number.parseInt(env.PORT || '4500', 10)

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
      port: frontendPort,
      strictPort: true,
      proxy: {
        '/api': {
          target: `http://localhost:${backendPort}`,
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
