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
      // Standard React pattern - calling setState in useEffect with proper dependencies.
      // Named hooks-extra/no-direct-set-state-in-use-effect before @eslint-react 5.
      '@eslint-react/set-state-in-effect': 'off',
      // React 19 context provider pattern - Radix UI requires .Provider for now
      '@eslint-react/no-context-provider': 'off',
      // @eslint-react 5 reorganised its presets and these dropped out of
      // `recommended`, though the plugin still ships them. They were all active
      // (and passing) under the 1.x preset, so they are re-stated here rather than
      // quietly lost — several are genuine bug catchers, not style.
      '@eslint-react/no-duplicate-key': 'error',
      '@eslint-react/no-implicit-key': 'error',
      '@eslint-react/no-unused-state': 'error',
      '@eslint-react/no-unstable-context-value': 'error',
      '@eslint-react/no-unstable-default-props': 'error',
      '@eslint-react/no-misused-capture-owner-stack': 'error',
      '@eslint-react/dom-no-missing-button-type': 'error',
      '@eslint-react/dom-no-missing-iframe-sandbox': 'error',
      '@eslint-react/dom-no-unsafe-target-blank': 'error',
    },
  },
  {
    plugins: {
      'react-hooks': pluginReactHooks,
      // '@eslint-react': pluginReact,
    },
    rules: {
      // Deliberately not `...pluginReactHooks.configs.recommended.rules`: from
      // eslint-plugin-react-hooks 7 that preset also turns on the React Compiler
      // rule set (set-state-in-effect, purity, globals, incompatible-library,
      // preserve-manual-memoization). Those are new checks rather than part of the
      // eslint 10 move, and one of them — set-state-in-effect — is a pattern this
      // repo already takes an explicit position on (see the override above). The two
      // rules below are exactly what `recommended` contributed under react-hooks 5,
      // so rule coverage is unchanged. Adopting the compiler rules is tracked
      // separately.
      // '@eslint-react/no-unstable-context-value': 'off',
      // '@eslint-react/no-unstable-default-props': 'off',
      // '@eslint-react/dom/no-missing-button-type': 'off',
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/rules-of-hooks': 'error',
    },
  },
] as Linter.Config[]
