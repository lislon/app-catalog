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
      // Deliberately not `...pluginReactHooks.configs.recommended.rules`: that
      // preset would decide the React Compiler rules below by omission. Each one is
      // stated here with its reason instead.
      //
      // The compiler-adjacent checks the two plugins SHARE (purity,
      // set-state-in-render, static-components, use-memo, error-boundaries,
      // unsupported-syntax) already arrive via @eslint-react's own `recommended`
      // spread above, so they are not repeated here.
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/rules-of-hooks': 'error',

      // React Compiler rules only this plugin ships.
      'react-hooks/immutability': 'error',
      'react-hooks/refs': 'error',
      'react-hooks/preserve-manual-memoization': 'error',
      // Reports a component the compiler must skip because a library hands back
      // values it cannot memoize safely. Two known sites (TanStack Table) carry a
      // local suppression naming the library, which is what keeps this rule useful
      // for the next such library instead of switching it off wholesale.
      'react-hooks/incompatible-library': 'error',
      // Reassigning module scope during render. Off for test files only, below.
      'react-hooks/globals': 'error',
      // Off, to stay consistent with `@eslint-react/set-state-in-effect` above,
      // which the project has an explicit recorded position against. The two are the
      // same check under two plugin names, so enabling one and not the other would
      // report the same 9 call sites as both allowed and forbidden. Changing the
      // position means refactoring those 9 sites, not flipping this line.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    // A test probe publishes its setState to module scope during render so `act()`
    // can drive it. Doing that from an effect instead would run it after the hook's
    // own sync effect and change the render timing these tests exist to pin. Test
    // files are never compiled by the React Compiler, so the rule buys nothing here.
    files: ['**/*.spec.ts*', '**/*.test.ts*', '**/*.test-d.ts*'],
    rules: {
      'react-hooks/globals': 'off',
    },
  },
] as Linter.Config[]
