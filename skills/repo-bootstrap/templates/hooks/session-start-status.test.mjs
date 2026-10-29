import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { shouldSuggestPlan, indexStatusLine, collect, CONFIG } from './session-start-status.mjs'
import { makeRepo, put, git, runScript } from './_helpers.mjs'

describe('session-start-status: plan nudge', () => {
  it('suggests on a clean task branch with no commits ahead', () => {
    assert.equal(shouldSuggestPlan({ branch: 'feat/x', aheadCount: 0, dirty: false }), true)
  })
  for (const state of [
    { branch: 'feat/x', aheadCount: 2, dirty: false },
    { branch: 'feat/x', aheadCount: 0, dirty: true },
    { branch: 'dev', aheadCount: 0, dirty: false },
    { branch: 'main', aheadCount: 0, dirty: false },
    { branch: 'release/v1.2.3', aheadCount: 0, dirty: false },
    { branch: '', aheadCount: 0, dirty: false },
  ]) {
    it(`stays silent for ${JSON.stringify(state)}`, () => assert.equal(shouldSuggestPlan(state), false))
  }
})

describe('session-start-status: index line', () => {
  it('covers ready / building / not installed / missing / disabled', () => {
    assert.match(indexStatusLine({ hasIndex: true }), /ready/)
    assert.match(indexStatusLine({ hasIndex: false, buildLogExists: true }), /still building/)
    assert.match(indexStatusLine({ hasIndex: false, buildLogExists: false, cliInstalled: false }), /not installed/)
    assert.match(indexStatusLine({ hasIndex: false, buildLogExists: false, cliInstalled: true }), /missing — run/)
    assert.equal(indexStatusLine({ hasIndex: true }, null), '')
  })
})

describe('session-start-status: collect (integration)', () => {
  const noCli = { ...CONFIG, index: { ...CONFIG.index, cli: null } }

  it('nudges on a fresh branch and reports a missing index', () => {
    const repo = makeRepo({ 'a.js': 'a' }, 'main')
    git(repo, 'checkout', '-qb', 'feat/new')
    const lines = collect(repo, noCli)
    assert.match(lines[0], /Fresh workspace: no commits ahead of origin\/main/)
    assert.match(lines[1], /missing/)
  })

  it('stays quiet about planning once there is work, and reports a ready index', () => {
    const repo = makeRepo({ 'a.js': 'a' }, 'main')
    git(repo, 'checkout', '-qb', 'feat/new')
    put(repo, { 'b.js': 'b', 'graphify-out/graph.json': '{}' })
    const lines = collect(repo, noCli)
    assert.equal(lines.length, 1)
    assert.match(lines[0], /ready/)
  })

  it('works without a base ref and with the index disabled', () => {
    const repo = makeRepo({ 'a.js': 'a' }, 'trunk')
    git(repo, 'update-ref', '-d', 'refs/remotes/origin/trunk')
    assert.deepEqual(collect(repo, { ...CONFIG, index: null }), [])
  })

  it('CLI prints SessionStart additionalContext JSON; empty outside a repo exits 0', () => {
    const repo = makeRepo({ 'a.js': 'a' }, 'main')
    git(repo, 'checkout', '-qb', 'feat/new')
    const r = runScript('session-start-status.mjs', { env: { CLAUDE_PROJECT_DIR: repo } })
    assert.equal(r.status, 0)
    assert.equal(JSON.parse(r.stdout).hookSpecificOutput.hookEventName, 'SessionStart')
    assert.equal(runScript('session-start-status.mjs', { env: { CLAUDE_PROJECT_DIR: '/nonexistent-dir-xyz' } }).status, 0)
  })
})
