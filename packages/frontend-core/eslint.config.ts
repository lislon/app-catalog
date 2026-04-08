import pluginReact from '@eslint-react/eslint-plugin'
import type { Linter } from 'eslint'
import pluginReactHooks from 'eslint-plugin-react-hooks'
import rootConfig from './root-symlink.eslint.config'

export default [
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },
  ...rootConfig,
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    ...pluginReact.configs.recommended,
    rules: {
      ...pluginReact.configs.recommended.rules,
      '@eslint-react/no-array-index-key': 'off',
      // Standard React pattern - calling setState in useEffect with proper dependencies
      '@eslint-react/hooks-extra/no-direct-set-state-in-use-effect': 'off',
      // React 19 context provider pattern - Radix UI requires .Provider for now
      '@eslint-react/no-context-provider': 'off',
    },
  },
  {
    plugins: {
      'react-hooks': pluginReactHooks,
      // '@eslint-react': pluginReact,
    },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,
      // '@eslint-react/no-unstable-context-value': 'off',
      // '@eslint-react/no-unstable-default-props': 'off',
      // '@eslint-react/dom/no-missing-button-type': 'off',
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/rules-of-hooks': 'error',
    },
  },
] as Array<Linter.Config>
