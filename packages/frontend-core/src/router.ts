/**
 * The core's own router, on a subpath of its own — a deliberate quarantine.
 *
 * `createAcRouter` carries `declare module '@tanstack/react-router'` for both
 * `Register` and (via `routeTree.gen.ts`) `FileRoutesByPath`. TypeScript
 * collects module augmentations when it builds the PROGRAM, and `import type`
 * still resolves the specifier — so there is no way to reference anything from
 * that file without admitting its augmentations. Even `await import()` does it;
 * type elision is emit-only.
 *
 * Two declarations of `Register.router` in one program is a hard `TS2717`, and
 * two of `FileRoutesByPath` collapses `createFileRoute` to `path?: never`. So a
 * deployment that composes its own route tree — core routes plus its own, and
 * therefore its own augmentation — must never end up with this file in its
 * program. Keeping it off the main entry's import graph is what makes that
 * possible, and this subpath is the only published door to it.
 *
 * Import it if you use the core's route tree unchanged: that is the example app
 * and the core's own test suites, each a single-`Register` program. Do NOT
 * import it from a deployment that declares its own.
 */
export { createAcRouter } from './util/createAcRouter'
export type { AcRouterInitParams } from './types/types'
