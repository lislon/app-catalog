import type { Linter } from 'eslint'
import rootConfig from './root-symlink.eslint.config'

// The React rule blocks that used to live here now live in the root config, so
// every React package in the workspace gets them instead of only this one.
export default [
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },
  ...rootConfig,
] as Linter.Config[]
