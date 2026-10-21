/**
 * The test clocks. Every wait in the kit watches for a condition; these only
 * bound how long it may watch. Each inner wait is shorter than the step that
 * contains it, so a failure reports the inner wait's error and DOM dump, not a
 * bare "step timed out". No side effects: vite configs import this file.
 */

/** One wait for the UI to react: a `findBy*` or `waitFor` inside a step. */
export const CONDITION_TIMEOUT = 5_000

/** The first mount of the whole app, until data or an error is on screen. */
export const MOUNT_TIMEOUT = 10_000

/** One step or test. Must exceed both waits above. */
export const STEP_TIMEOUT = 30_000
