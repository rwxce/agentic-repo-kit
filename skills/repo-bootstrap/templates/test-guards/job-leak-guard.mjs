/**
 * WHAT: Test-suite safety net for background work a test leaves behind: scheduled jobs, queued
 *   tasks, outbox rows, open timers. It tracks every in-memory test backend a test creates and, in
 *   `afterEach`, fails THAT test when one still holds pending work, with a message naming the jobs
 *   and the helpers that fix it (drain = run them to completion, cancel = discard them).
 *   Why not global fake timers: running the whole suite under fake timers hides the leak (the job
 *   just never runs and is discarded at teardown), and with real timers the leaked job fires later,
 *   inside an unrelated test, as a flake blamed on the wrong file. The guard makes the leak visible
 *   and points at the test that caused it. Timers stay per-test and explicit.
 * REPO SIGNAL: tests that create an in-memory backend with a scheduler or queue (an embedded
 *   database test harness, a fake job queue, an in-process worker), and CI flakes that move between
 *   files or disappear on re-run.
 * CONFIGURE: write `listPending(instance)` for your harness (query its scheduled-jobs table or
 *   queue) and name your drain/cancel helpers in `fixHint`. Wire it in the test runner's setup
 *   file: wrap the harness factory so every instance is tracked, then call `assertNoLeaks` in
 *   `afterEach` (example for Vitest below). Limit: it only sees the queue you list. Work scheduled
 *   inside a third-party component's own storage is invisible to it; cover that test by test.
 *
 * Example wiring (Vitest setup file, EXAMPLE names: `<test-harness>` exports `createTestBackend`):
 *
 *   import { afterEach, expect, vi } from "vitest"
 *   import { createJobLeakGuard } from "./job-leak-guard.mjs"
 *
 *   const guard = createJobLeakGuard({
 *     listPending: async (t) =>
 *       (await t.run((ctx) => ctx.db.system.query("<scheduled-jobs-table>").collect()))
 *         .filter((job) => job.state.kind === "pending" || job.state.kind === "inProgress")
 *         .map((job) => job.name),
 *     fixHint: "Drain them with drainScheduledJobs(t) or cancel them with cancelScheduledJobs(t) before the test ends.",
 *   })
 *   vi.mock("<test-harness>", async (importOriginal) => {
 *     const actual = await importOriginal()
 *     return { ...actual, createTestBackend: (...args) => guard.track(actual.createTestBackend(...args)) }
 *   })
 *   afterEach(() => guard.assertNoLeaks(expect.getState().currentTestName))
 *
 *   `vi.mock` of a dependency only applies if the runner transforms it (Vitest: list it in
 *   `server.deps.inline`). Jest: `jest.mock` with `jest.requireActual`, same shape.
 */

/**
 * @param {{
 *   listPending: (instance: any) => Promise<string[]> | string[],
 *   fixHint?: string,
 * }} options
 */
export function createJobLeakGuard({ listPending, fixHint = "Drain or cancel them before the test ends." }) {
  if (typeof listPending !== "function") throw new TypeError("createJobLeakGuard needs a listPending(instance) function")
  const instances = new Set()

  return {
    /** Registers an instance and returns it unchanged, so it can wrap a factory call. */
    track(instance) {
      instances.add(instance)
      return instance
    },
    /** Instances tracked since the last check (for tests of the guard itself). */
    get size() {
      return instances.size
    },
    /**
     * Throws when any instance created during the test still holds pending work. Always clears
     * the tracked set first, so one leaking test never fails the next one.
     */
    async assertNoLeaks(testName = "<unknown test>") {
      const tracked = [...instances]
      instances.clear()
      const leaked = []
      for (const instance of tracked) leaked.push(...(await listPending(instance)).map((name) => name ?? "<unnamed job>"))
      if (leaked.length) throw new Error(leakMessage(testName, leaked, fixHint))
    },
  }
}

/** The failure message: the test, the jobs (deduplicated with counts) and how to fix it. */
export function leakMessage(testName, jobs, fixHint) {
  const counts = new Map()
  for (const job of jobs) counts.set(job, (counts.get(job) ?? 0) + 1)
  const list = [...counts].map(([job, n]) => (n > 1 ? `${job} (x${n})` : job)).join(", ")
  return `"${testName}" left background work pending: ${list}. ${fixHint}`
}
