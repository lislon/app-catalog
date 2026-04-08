import { defineConfig } from 'tsdown'

export default defineConfig({
  platform: 'node',
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  // ERROR  [publint] pkg.types is ./dist/index.d.ts but the file does not exist.
  // exports: {
  //   devExports: 'my-custom-condition',
  // },
  deps: {
    neverBundle: [
      '@prisma/client',
      '@prisma/client/runtime/client',
      '@prisma/adapter-pg',
    ],
  },
  unbundle: true,
  publint: {
    strict: true,
  },
})
