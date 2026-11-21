// Zero-dependency tests. Run: node --test automations/
import test from 'node:test'
import assert from 'node:assert/strict'
import { authHeadersFrom, checkWithRetry, smoke } from './smoke-deploy.mjs'

const config = { checks: ['/a', '/b'], retryAttempts: 3, retryBackoffMs: 1, requestTimeoutMs: 1000 }
const sleep = async () => {}

test('passes when every path answers 200', async () => {
  const results = await smoke('http://x.test', { config, sleep, fetchImpl: async () => ({ status: 200 }) })
  assert.deepEqual(results.map((r) => r.ok), [true, true])
})

test('retries, then reports the last status', async () => {
  let calls = 0
  const r = await checkWithRetry('http://x.test', '/a', { config, sleep, fetchImpl: async () => (calls++, { status: 500 }) })
  assert.equal(calls, 3)
  assert.equal(r.ok, false)
  assert.match(r.detail, /^500 \(after 3 attempts\)/)
})

test('recovers on a later attempt', async () => {
  let calls = 0
  const r = await checkWithRetry('http://x.test', '/a', {
    config,
    sleep,
    fetchImpl: async () => (++calls < 2 ? { status: 503 } : { status: 200 }),
  })
  assert.equal(r.ok, true)
})

test('treats redirects and network errors as failures', async () => {
  const redirect = await checkWithRetry('http://x.test', '/a', { config, sleep, fetchImpl: async () => ({ status: 307 }) })
  assert.equal(redirect.ok, false)
  const thrown = await checkWithRetry('http://x.test', '/a', { config, sleep, fetchImpl: async () => { throw new Error('boom') } })
  assert.match(thrown.detail, /boom/)
})

test('resolves paths against the base URL', async () => {
  const seen = []
  await smoke('http://x.test/base/', { config, sleep, fetchImpl: async (url) => (seen.push(url), { status: 200 }) })
  assert.deepEqual(seen, ['http://x.test/a', 'http://x.test/b'])
})

test('auth headers are all or nothing, and are sent on every request', async () => {
  const map = { 'X-Id': 'SMOKE_ID', 'X-Secret': 'SMOKE_SECRET' }
  assert.deepEqual(authHeadersFrom({ SMOKE_ID: 'i' }, map), {})
  assert.deepEqual(authHeadersFrom({}, {}), {})
  const headers = authHeadersFrom({ SMOKE_ID: 'i', SMOKE_SECRET: 's' }, map)
  assert.deepEqual(headers, { 'X-Id': 'i', 'X-Secret': 's' })
  const seen = []
  await checkWithRetry('http://x.test', '/a', { config, sleep, headers, fetchImpl: async (_u, init) => (seen.push(init.headers), { status: 200 }) })
  assert.deepEqual(seen, [headers])
})

test('a redirect to a proxy login is a failed check, not a pass', async () => {
  const r = await checkWithRetry('http://x.test', '/a', { config, sleep, headers: {}, fetchImpl: async () => ({ status: 302 }) })
  assert.equal(r.ok, false)
})
