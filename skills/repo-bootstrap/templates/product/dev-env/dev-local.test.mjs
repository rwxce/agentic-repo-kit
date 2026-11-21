import assert from 'node:assert/strict'
import { createServer } from 'node:net'
import { describe, it } from 'node:test'
import { isPortFree, localEnv, pickPort } from './dev-local.mjs'

describe('dev-local', () => {
  it('picks the first free port in the range', async () => {
    const busy = new Set([3000, 3001])
    assert.equal(await pickPort(async (p) => !busy.has(p), 3000, 3005), 3002)
  })

  it('throws when the whole range is busy', async () => {
    await assert.rejects(pickPort(async () => false, 3000, 3001), /no free port/)
  })

  it('forces the URL vars to localhost and keeps everything else', () => {
    const env = localEnv({ AUTH_URL: 'https://me.tunnel.example', API_KEY: 'k' }, 3002, ['AUTH_URL', 'APP_URL'])
    assert.deepEqual(env, { AUTH_URL: 'http://localhost:3002', APP_URL: 'http://localhost:3002', API_KEY: 'k', PORT: '3002' })
  })

  it('detects a port that is really taken', async () => {
    const server = createServer()
    await new Promise((r) => server.listen(0, '127.0.0.1', r))
    const { port } = server.address()
    assert.equal(await isPortFree(port), false)
    await new Promise((r) => server.close(r))
  })
})
