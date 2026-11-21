import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { createJobLeakGuard, leakMessage } from './job-leak-guard.mjs'

// A fake in-memory backend with a scheduler, like an embedded test harness.
function fakeBackend() {
  const jobs = []
  return {
    schedule: (name) => jobs.push({ name, state: 'pending' }),
    drain: () => jobs.forEach((j) => (j.state = 'success')),
    cancel: () => jobs.forEach((j) => (j.state = 'canceled')),
    jobs,
  }
}
const listPending = (b) => b.jobs.filter((j) => j.state === 'pending').map((j) => j.name)

describe('job-leak-guard', () => {
  it('passes when every tracked backend was drained or cancelled', async () => {
    const guard = createJobLeakGuard({ listPending })
    const a = guard.track(fakeBackend())
    const b = guard.track(fakeBackend())
    a.schedule('sendWelcomeEmail')
    b.schedule('syncBilling')
    a.drain()
    b.cancel()
    await guard.assertNoLeaks('clean test')
  })

  it('fails the leaking test by name, listing the jobs and the fix', async () => {
    const guard = createJobLeakGuard({ listPending, fixHint: 'Use drainJobs(t) or cancelJobs(t).' })
    const t = guard.track(fakeBackend())
    t.schedule('syncBilling')
    t.schedule('syncBilling')
    t.schedule('sendWelcomeEmail')
    await assert.rejects(guard.assertNoLeaks('creates a workspace'), {
      message: '"creates a workspace" left background work pending: syncBilling (x2), sendWelcomeEmail. Use drainJobs(t) or cancelJobs(t).',
    })
  })

  it('clears tracked instances even when it throws, so the next test is not blamed', async () => {
    const guard = createJobLeakGuard({ listPending })
    guard.track(fakeBackend()).schedule('leaky')
    await assert.rejects(guard.assertNoLeaks('leaky test'))
    assert.equal(guard.size, 0)
    await guard.assertNoLeaks('next test')
  })

  it('track returns the instance so it can wrap a factory', () => {
    const guard = createJobLeakGuard({ listPending })
    const b = fakeBackend()
    assert.equal(guard.track(b), b)
    assert.equal(guard.size, 1)
  })

  it('supports async listPending and unnamed jobs', async () => {
    const guard = createJobLeakGuard({ listPending: async () => [undefined] })
    guard.track({})
    await assert.rejects(guard.assertNoLeaks('x'), /<unnamed job>/)
  })

  it('requires listPending', () => {
    assert.throws(() => createJobLeakGuard({}), TypeError)
  })

  it('formats a single job without a count', () => {
    assert.equal(leakMessage('t', ['a'], 'Fix it.'), '"t" left background work pending: a. Fix it.')
  })
})

describe('job-leak-guard: wired into afterEach (node:test)', () => {
  const guard = createJobLeakGuard({ listPending })
  const failures = []
  afterEach(async (t) => {
    try {
      await guard.assertNoLeaks(t.name)
    } catch (error) {
      failures.push(error.message)
    }
  })

  it('a test that cancels its job', () => {
    const b = guard.track(fakeBackend())
    b.schedule('job-a')
    b.cancel()
  })

  it('a test that forgets its job', () => {
    guard.track(fakeBackend()).schedule('job-b')
  })

  it('blames only the test that leaked', () => {
    assert.equal(failures.length, 1)
    assert.match(failures[0], /^"a test that forgets its job" left background work pending: job-b\./)
  })
})
