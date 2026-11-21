# test-guards

Guards for the test suite itself: they make a class of silent or flaky failure loud, and blame the
test or page that caused it. Every file starts with a header (what / repo signal / configure).

| Template | Prevents | Repo signal that justifies it | Notes |
|---|---|---|---|
| `job-leak-guard.mjs` (+ test) | A test that schedules a job (or queues a task, opens a timer) and never drains or cancels it. Under global fake timers the leak is hidden; under real timers it fires inside a later, unrelated test as a flake blamed on the wrong file. | In-memory test backends with a scheduler or queue; CI flakes that move between files. | Wrap the harness factory with `guard.track`, call `guard.assertNoLeaks(testName)` in `afterEach`. Ship drain and cancel helpers and name them in `fixHint`. Timers stay per-test and explicit. Only sees the queue `listPending` reads. |

## Rules that come with them

- **Blame the offender.** A guard fails the test that leaked, never a later one: clear tracked
  state before throwing.
- **No global magic.** Do not make fake timers (or any mock that hides work) global to silence a
  guard; that hides the bug the guard exists to show.
- **Say the fix in the message.** The failure names the helper to call, so an agent fixes the test
  instead of disabling the guard.
