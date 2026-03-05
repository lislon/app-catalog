import tanstackRouter from '@tanstack/router-plugin/vite'
import { tanstackViteConfig } from '@tanstack/vite-config'
import viteReact from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import svgr from 'vite-plugin-svgr'
import { defineConfig, mergeConfig } from 'vitest/config'

import packageJson from './package.json'

import type { ViteUserConfig } from 'vitest/config'

const config = defineConfig(({ mode }) => {
  const tsconfigPath =
    mode === 'lenient' ? './tsconfig-lenient.json' : './tsconfig.json'

  const myConfig: ViteUserConfig = {
    server: {
      port: 4999,
      strictPort: true,
    },
    build: {
      copyPublicDir: false,
      rollupOptions: {
        output: {
          preserveModulesRoot: 'src',
        },
      },
    },
    test: {
      name: packageJson.name,
      dir: './src/__tests__',
      watch: false,
      environment: 'jsdom',
      typecheck: { enabled: true },
      setupFiles: ['./src/__tests__/integration/setup/testSetup.ts'],
      include: ['./src/__tests__/**/*.test.{ts,tsx}'],
    },
    plugins: [
      tanstackRouter(),
      viteReact(),
      svgr(),
      // Copy public directory and CSS file to dist during build
      viteStaticCopy({
        targets: [
          {
            src: 'public/[!.]*',
            dest: 'public',
          },
          {
            src: 'src/index.css',
            dest: '.',
          },
        ],
      }),
    ],
  }

  // Only merge tanstack config for non-test modes
  if (process.env.NODE_ENV !== 'test') {
    return mergeConfig(
      tanstackViteConfig({
        tsconfigPath,
        entry: './src/index.tsx',
        srcDir: './src',
        cjs: false,
      }),
      myConfig,
    )
  }

  return myConfig
})

export default config
