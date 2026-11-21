import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { LOAD_MESSAGE, parseHandoffHeader, shouldLoad } from './load-handoff.mjs'
import { makeRepo, put, runScript } from './_helpers.mjs'

const HOUR = 60 * 60 * 1000

describe('load-handoff: parseHandoffHeader', () => {
  it('reads branch and updated', () => {
    assert.deepEqual(parseHandoffHeader('# Hand off\n\nbranch: feat/x\nsha: abc\nupdated: 2030-01-01T10:00:00Z\n'), {
      branch: 'feat/x',
      updated: '2030-01-01T10:00:00Z',
    })
    assert.deepEqual(parseHandoffHeader('garbage'), { branch: null, updated: null })
  })
})

describe('load-handoff: shouldLoad', () => {
  const base = { handoffBranch: 'feat/x', currentBranch: 'feat/x', ageMs: HOUR }
  it('loads a fresh hand off of the same branch', () => {
    assert.equal(shouldLoad({ source: 'startup', ...base }), true)
  })
  it('skips another branch or an old hand off', () => {
    assert.equal(shouldLoad({ source: 'startup', ...base, currentBranch: 'feat/y' }), false)
    assert.equal(shouldLoad({ source: 'startup', ...base, ageMs: 25 * HOUR }), false)
    assert.equal(shouldLoad({ source: 'startup', ...base, ageMs: Number.NaN }), false)
  })
  it('always loads after a compaction', () => {
    assert.equal(shouldLoad({ source: 'compact', handoffBranch: null, currentBranch: 'feat/y', ageMs: Number.NaN }), true)
  })
})

describe('load-handoff: CLI', () => {
  it('prints the pointer for a fresh hand off of the current branch', () => {
    const repo = makeRepo({ 'a.js': 'a\n' }, 'main')
    put(repo, { '.context/handoff.md': `# Hand off\n\nbranch: main\nsha: x\nupdated: ${new Date().toISOString()}\n` })
    const r = runScript('load-handoff.mjs', { stdin: JSON.stringify({ source: 'startup' }), cwd: repo, env: { CLAUDE_PROJECT_DIR: repo } })
    assert.equal(r.status, 0)
    assert.equal(r.stdout.trim(), LOAD_MESSAGE)
  })
  it('is silent without a hand off and exits 0 on malformed stdin', () => {
    const repo = makeRepo()
    const r = runScript('load-handoff.mjs', { stdin: 'nope', cwd: repo, env: { CLAUDE_PROJECT_DIR: repo } })
    assert.equal(r.status, 0)
    assert.equal(r.stdout, '')
  })
})
