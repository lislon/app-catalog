import type { Linter } from 'eslint'
import rootConfig, { reactConfigs } from './root-symlink.eslint.config'

export default [
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },
  ...rootConfig,
  ...reactConfigs,
] as Linter.Config[]
