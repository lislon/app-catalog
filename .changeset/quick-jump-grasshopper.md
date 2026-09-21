---
'@igstack/app-catalog-frontend-core': patch
'@igstack/app-catalog-test-kit': patch
---

Quick Jump's hover tell now uses the grasshopper mark next to the green `JUMP`
word, matching the mockup the section was designed against. It stood in as a
lucide glyph, which read as a generic icon rather than as the one recognisable
bit of the interaction.

The test kit registers `vite-plugin-svgr` instead of mocking svg imports one at a
time. The old setup only knew about a single file, so any component importing a
new `?react` svg threw while rendering — which surfaced as the whole app panel
failing to appear, several test files away from the actual cause.
