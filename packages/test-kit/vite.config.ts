import path from 'node:path'
import { defineConfig, mergeConfig } from 'vitest/config'
import { tanstackViteConfig } from '@tanstack/vite-config'
import viteReact from '@vitejs/plugin-react'
import packageJson from './package.json'

const config = defineConfig({
  plugins: [viteReact()],
  resolve: {
    // Run the app from frontend-core's sources, and let the harness' svg mock
    // match the `~/...` specifier the app itself imports with.
    conditions: ['my-custom-condition'],
    alias: {
      '~': path.resolve(__dirname, '../frontend-core/src'),
    },
  },
  test: {
    name: packageJson.name,
    // The kit ships the harness in `src`; the scenarios driving it live in `tests`.
    dir: './tests',
    watch: false,
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost:3000',
      },
    },
    setupFiles: ['./src/setup/testSetup.ts'],
    globals: true,
    testTimeout: 30000,
  },
})

export default mergeConfig(
  config,
  tanstackViteConfig({
    entry: ['./src/index.ts', './src/setup/testSetup.ts'],
    srcDir: './src',
    cjs: false,
  }),
)
