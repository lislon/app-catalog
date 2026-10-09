import type { RegisteredRouter } from '@tanstack/react-router'
import type { AcRouterInitParams } from '@igstack/app-catalog-frontend-core'

/** Builds the router the harness mounts the app with. */
export type CreateRouterFn = (init: AcRouterInitParams) => RegisteredRouter

/**
 * The deployment's router factory, registered once per test process.
 *
 * The harness cannot simply import `createAcRouter`, and the reason is not
 * style. That module carries `declare module '@tanstack/react-router'` for
 * `Register` and `FileRoutesByPath`, TypeScript collects augmentations when it
 * builds the PROGRAM, and `import type` still resolves the specifier — so any
 * reference at all drags them in. (`await import()` too; type elision is
 * emit-only.) A deployment that composes its own route tree declares its own
 * `Register`, and two declarations in one program is a hard `TS2717`.
 *
 * Injection is therefore the only shape available, and registration rather than
 * a required `given()` option so that adding this breaks no existing call site:
 * 72 of them across the suites would otherwise have had to change. The trade is
 * that a missing factory fails at the first test instead of at compile time —
 * loud, and not a hole in the types.
 *
 * Module-level by design, matching the msw server and IndexedDB handles in
 * `given()`: one deployment per vitest process, set once from a setup file.
 */
let factory: CreateRouterFn | undefined

/**
 * Registers how to build the router. Call from a vitest `setupFiles` entry.
 *
 * Using the core's route tree unchanged? Pass `createAcRouter` from
 * `@igstack/app-catalog-frontend-core/router`.
 */
export function setRouterFactory(createRouter: CreateRouterFn): void {
  factory = createRouter
}

export function requireRouterFactory(): CreateRouterFn {
  if (!factory) {
    throw new Error(
      'No router factory registered. Add a vitest setup file calling ' +
        'setRouterFactory(createYourRouter) — the harness cannot import a ' +
        'route tree itself without colliding with your `Register` augmentation.',
    )
  }
  return factory
}
