// @ts-check

// @ts-ignore Needed due to moduleResolution Node vs Bundler
import pluginCspell from '@cspell/eslint-plugin'
import pluginReact from '@eslint-react/eslint-plugin'
import { tanstackConfig } from '@tanstack/eslint-config'
import vitest from '@vitest/eslint-plugin'
import pluginReactHooks from 'eslint-plugin-react-hooks'

const config = [
  {
    name: 'app-catalog/ignores',
    ignores: ['**/dist-ts/**', '**/src/generated/**'],
  },
  ...tanstackConfig,
  {
    name: 'disable-because-i-cant-fix-vscode',
    rules: {
      'import/order': 'off',
    },
  },
  {
    name: 'tanstack/temp',
    plugins: {
      cspell: pluginCspell,
    },
    rules: {
      '@typescript-eslint/array-type': ['error', { default: 'array' }],
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'no-case-declarations': 'off',
    },
  },
  // React rules live at the workspace root, not in one package's config: every
  // package that ships React needs them, and `frontend-core` was the only one
  // that had them. `test-kit` is published, so a hook bug there reaches
  // consumers. Scoped to ts+tsx rather than tsx alone because custom hooks and
  // non-JSX helpers live in `.ts` files, which is where `rules-of-hooks` and
  // `exhaustive-deps` earn their keep. Packages with no React are unaffected:
  // these rules only fire on component/hook shapes.
  {
    name: 'app-catalog/react',
    files: ['**/*.{ts,tsx}'],
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
    name: 'app-catalog/react-hooks',
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': pluginReactHooks,
    },
    rules: {
      // Deliberately not `...pluginReactHooks.configs.recommended.rules`: that
      // preset would decide the React Compiler rules below by omission. Each one is
      // stated here with its reason instead.
      //
      // The compiler-adjacent checks the two plugins SHARE (purity,
      // set-state-in-render, static-components, use-memo, error-boundaries,
      // unsupported-syntax) already arrive via @eslint-react's own `recommended`
      // spread above, so they are not repeated here. The severities are not
      // identical between the two plugins — @eslint-react ships `purity` as a
      // warning where react-hooks has it as an error — which is left as-is rather
      // than folded into this change.
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/rules-of-hooks': 'error',

      // React Compiler rules only this plugin ships. Note no React Compiler is
      // configured here — `viteReact()` runs with no babel plugins — so these are
      // compiler-READINESS checks, not descriptions of current runtime behaviour.
      // They are worth keeping on so the codebase stays eligible: today they cost
      // nothing, and they stop the gap from quietly widening.
      'react-hooks/immutability': 'error',
      'react-hooks/refs': 'error',
      'react-hooks/preserve-manual-memoization': 'error',
      // Reports a component the compiler must skip because a library hands back
      // values it cannot memoize safely. Two known sites (TanStack Table) carry a
      // local suppression naming the library, which is what keeps this rule useful
      // for the next such library instead of switching it off wholesale. Raised from
      // the `warn` that `recommended` ships, so a new one fails rather than scrolls
      // past: the whole point is being told about it.
      'react-hooks/incompatible-library': 'error',
      // Reassigning module scope during render. Off for test files only, below.
      'react-hooks/globals': 'error',
      // Both check the React Compiler's own configuration rather than component
      // code: `config` validates a compiler config comment, `gating` validates the
      // gating option. Nothing configures the compiler here, so both are vacuous
      // today and report nothing — on anyway, so that whoever does enable the
      // compiler gets told immediately if they configure it wrong.
      'react-hooks/config': 'error',
      'react-hooks/gating': 'error',
      // Off, to stay consistent with `@eslint-react/set-state-in-effect` above,
      // which the project has an explicit recorded position against. The two are the
      // same check under two plugin names, so enabling one and not the other would
      // report the same call sites as both allowed and forbidden. Changing the
      // position means refactoring those sites, not flipping this line.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['**/*.spec.ts*', '**/*.test.ts*', '**/*.test-d.ts*'],
    plugins: { vitest },
    rules: vitest.configs.recommended.rules,
    settings: { vitest: { typecheck: true } },
  },
  {
    // A test probe publishes its setState to module scope during render so `act()`
    // can drive it. Doing that from an effect instead would run it after the hook's
    // own sync effect and change the render timing these tests exist to pin. Test
    // files are never compiled by the React Compiler, so the rule buys nothing here.
    name: 'app-catalog/react-hooks-tests',
    files: ['**/*.spec.ts*', '**/*.test.ts*', '**/*.test-d.ts*'],
    rules: {
      'react-hooks/globals': 'off',
    },
  },
]

// Asserted, not annotated: the plugins' own config/plugin types are not
// assignable to `Linter.Config`, which is why the package-level configs cast too.
export default /** @type {import('eslint').Linter.Config[]} */ (config)
