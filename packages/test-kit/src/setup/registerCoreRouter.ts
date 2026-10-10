/**
 * Registers the core's own router for the test kit's own suites.
 *
 * These tests exercise the core's route tree unchanged, so they want
 * `createAcRouter` — and this is a single-`Register` program, so importing it
 * from `/router` is safe here. A deployment's test suite must NOT copy this
 * file: it declares its own `Register` for its own composed tree, and pulling
 * the core's in alongside it is a hard `TS2717`. It registers its own factory
 * from its own setup file instead.
 *
 * A setup file rather than an argument to `given()` so that the 72 existing
 * call sites across these suites needed no change at all.
 */
import { createAcRouter } from '@igstack/app-catalog-frontend-core/router'
import { setRouterFactory } from '../harness/routerFactory'

setRouterFactory(createAcRouter)
