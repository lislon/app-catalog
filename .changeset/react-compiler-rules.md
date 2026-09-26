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

No React Compiler is configured in this package, so these are readiness checks
rather than descriptions of current behaviour: nothing in the shipped bundle changes.
The one finding worth naming is the access-request section's copy-prompt callback,
which depended on an optional-chained member expression — a dependency the compiler
cannot preserve. It reads through a plain binding now. Under plain React that
dependency was already correct, so this is lint conformance, not a fixed bug.
