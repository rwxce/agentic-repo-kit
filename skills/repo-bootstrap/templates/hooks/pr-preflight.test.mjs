import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { heavyFileReason, isRealEnvFile, envIgnoreWeakened, findProblems } from './pr-preflight.mjs'
import { makeRepo, put, runScript } from './_helpers.mjs'

describe('pr-preflight: heavyFileReason', () => {
  const MB = 1024 * 1024
  it('flags media masters at any size', () => {
    assert.ok(heavyFileReason('clip.mp4', 10))
    assert.ok(heavyFileReason('public/hero.GIF', 10))
  })
  it('flags large files outside exempt dirs, allows them inside', () => {
    assert.match(heavyFileReason('data/dump.bin', 3 * MB), /3\.0 MB/)
    assert.equal(heavyFileReason('public/big.png', 3 * MB), null)
  })
  it('allows small ordinary files', () => {
    assert.equal(heavyFileReason('src/a.ts', 1000), null)
    assert.equal(heavyFileReason('src/a.ts', 2 * MB), null)
  })
})

describe('pr-preflight: env files', () => {
  it('recognises real env files incl. multi-suffix and nested', () => {
    for (const f of ['.env', '.env.local', '.env.production.local', 'apps/web/.env']) assert.equal(isRealEnvFile(f), true, f)
  })
  it('allows templates and unrelated names', () => {
    for (const f of ['.env.example', '.env.local.example', 'sub/.env.sample', 'environment.ts', 'src/.environment']) assert.equal(isRealEnvFile(f), false, f)
  })
  it('detects a removed .env ignore line', () => {
    assert.equal(envIgnoreWeakened('--- a/.gitignore\n+++ b/.gitignore\n@@\n-.env\n'), true)
    assert.equal(envIgnoreWeakened('@@\n-.env.local\n'), true)
  })
  it('ignores removed comments / negations and rewritten rules', () => {
    assert.equal(envIgnoreWeakened('@@\n-# .env files\n'), false)
    assert.equal(envIgnoreWeakened('@@\n-!.env.example\n'), false)
    assert.equal(envIgnoreWeakened('@@\n-.env\n+.env*\n'), false)
    assert.equal(envIgnoreWeakened(''), false)
  })
})

describe('pr-preflight: findProblems (integration)', () => {
  it('is clean on a normal change', () => {
    const repo = makeRepo({ '.gitignore': '.env\n', 'a.js': 'a' })
    put(repo, { 'a.js': 'b' })
    assert.deepEqual(findProblems(repo), [])
  })

  it('flags an untracked real .env but not the example', () => {
    const repo = makeRepo({ 'a.js': 'a' })
    put(repo, { '.env': 'SECRET=1', '.env.example': 'SECRET=' })
    const labels = findProblems(repo).map((p) => p.label)
    assert.deepEqual(labels, ['Real env file committed: .env'])
  })

  it('flags .gitignore losing its .env line', () => {
    const repo = makeRepo({ '.gitignore': 'node_modules\n.env\n', 'a.js': 'a' })
    put(repo, { '.gitignore': 'node_modules\n' })
    assert.equal(findProblems(repo)[0].label, '.gitignore no longer ignores .env')
  })

  it('flags media masters and oversized files, not public/ ones', () => {
    const repo = makeRepo({ 'a.js': 'a' })
    put(repo, { 'promo.mp4': 'x', 'data/big.bin': 'x'.repeat(3 * 1024 * 1024), 'public/ok.png': 'x'.repeat(3 * 1024 * 1024) })
    const labels = findProblems(repo).map((p) => p.label).sort()
    assert.deepEqual(labels, ['Heavy file committed: data/big.bin', 'Heavy file committed: promo.mp4'])
  })

  it('honors CI base refs from the environment', () => {
    const repo = makeRepo({ 'a.js': 'a' })
    put(repo, { '.env.production': 'X=1' })
    // base ref that resolves: still finds the untracked file
    assert.equal(findProblems(repo, undefined, { GITHUB_BASE_REF: 'main' }).length, 1)
    // unknown ref falls back to the probe list instead of crashing
    assert.equal(findProblems(repo, undefined, { GITHUB_BASE_REF: 'nope', PUSH_BEFORE_SHA: '0000000' }).length, 1)
  })
})

describe('pr-preflight: CLI', () => {
  it('advisory by default (exit 0), blocking with --strict (exit 1)', () => {
    const repo = makeRepo({ 'a.js': 'a' })
    put(repo, { '.env': 'X=1' })
    const env = { CLAUDE_PROJECT_DIR: repo }
    const soft = runScript('pr-preflight.mjs', { env })
    assert.equal(soft.status, 0)
    assert.match(soft.stdout, /Real env file committed/)
    assert.equal(runScript('pr-preflight.mjs', { args: ['--strict'], env }).status, 1)
    assert.equal(runScript('pr-preflight.mjs', { args: ['--advisory'], env }).status, 0)
  })
  it('--strict is still 0 on a clean tree', () => {
    const repo = makeRepo({ 'a.js': 'a' })
    assert.equal(runScript('pr-preflight.mjs', { args: ['--strict'], env: { CLAUDE_PROJECT_DIR: repo } }).status, 0)
  })
})
