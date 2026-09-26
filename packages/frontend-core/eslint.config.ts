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
      // @eslint-react 5's `recommended` added its own copies of these two. The
      // react-hooks block below owns them, so the duplicates are off rather than
      // reporting every violation twice.
      '@eslint-react/rules-of-hooks': 'off',
      '@eslint-react/exhaustive-deps': 'off',
    },
  },
  {
    plugins: {
      'react-hooks': pluginReactHooks,
      // '@eslint-react': pluginReact,
    },
    rules: {
      // Deliberately not `...pluginReactHooks.configs.recommended.rules`. Under
      // react-hooks 7 that preset also turns on the rules only this plugin has —
      // preserve-manual-memoization, incompatible-library, globals, immutability,
      // refs. Those are a new class of check rather than part of the eslint 10 move,
      // so they are left for their own change. The two rules below are exactly what
      // `recommended` contributed under react-hooks 5, so coverage is unchanged.
      //
      // Note the compiler-adjacent checks the two plugins SHARE (purity,
      // set-state-in-render, static-components, use-memo, error-boundaries,
      // unsupported-syntax) do arrive, via @eslint-react's own `recommended` spread
      // above. Skipping this preset does not opt out of those.
      // '@eslint-react/no-unstable-context-value': 'off',
      // '@eslint-react/no-unstable-default-props': 'off',
      // '@eslint-react/dom/no-missing-button-type': 'off',
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/rules-of-hooks': 'error',
    },
  },
] as Linter.Config[]
