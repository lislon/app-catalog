---
'@igstack/app-catalog-frontend-core': patch
---

Adopt the remaining React Compiler lint rules

`eslint-plugin-react-hooks` ships five checks that its `recommended` preset turns
on and the previous lint config left undecided. Each is now stated explicitly with
its reason: `immutability`, `refs`, `preserve-manual-memoization` and
`incompatible-library` are on, `globals` is on outside test files, and
`set-state-in-effect` stays off so it agrees with the `@eslint-react` rule of the
same name rather than contradicting it.

One real finding came out of it: the access-request section's copy-prompt callback
depended on an optional-chained member expression, which the compiler cannot
preserve, so the memo was being dropped on every render. It now reads through a
plain binding.
