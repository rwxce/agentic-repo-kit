import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { CONFIG, computeFingerprint, sealFileName } from './pr-precheck-seal.mjs'
import { git, makeRepo, put, runScript } from './_helpers.mjs'

function featureRepo() {
  const repo = makeRepo({ '.gitignore': '.context/\n', 'a.txt': 'a\n' }, 'main')
  git(repo, 'checkout', '-qb', 'feat/x')
  put(repo, { 'a.txt': 'changed\n' })
  return repo
}

describe('pr-precheck-seal', () => {
  it('sanitises the branch into a file name', () => {
    assert.equal(sealFileName('feat/a b'), 'feat__a__b.sha')
    assert.equal(sealFileName(''), 'detached.sha')
  })

  it('fingerprint ignores staging/committing and .context/, changes with the content', () => {
    const repo = featureRepo()
    const before = computeFingerprint(repo, 'main')
    git(repo, 'add', '-A')
    assert.equal(computeFingerprint(repo, 'main'), before)
    git(repo, 'commit', '-qm', 'wip')
    assert.equal(computeFingerprint(repo, 'main'), before)
    put(repo, { '.context/scratch.txt': 'x' })
    assert.equal(computeFingerprint(repo, 'main'), before)
    put(repo, { 'c.txt': 'new\n' })
    assert.notEqual(computeFingerprint(repo, 'main'), before)
  })

  it('does not touch the real index', () => {
    const repo = featureRepo()
    computeFingerprint(repo, 'main')
    assert.equal(git(repo, 'diff', '--cached', '--name-only').trim(), '')
  })

  it('CLI: missing → write → fresh → stale; seal lives under CONFIG.sealDir', () => {
    const repo = featureRepo()
    assert.equal(runScript('pr-precheck-seal.mjs', { args: ['check'], cwd: repo }).status, 1)
    assert.equal(runScript('pr-precheck-seal.mjs', { args: ['write'], cwd: repo }).status, 0)
    assert.ok(existsSync(join(repo, CONFIG.sealDir, 'feat__x.sha')))
    assert.equal(runScript('pr-precheck-seal.mjs', { args: ['check'], cwd: repo }).status, 0)
    put(repo, { 'd.txt': 'd\n' })
    const stale = runScript('pr-precheck-seal.mjs', { args: ['check'], cwd: repo })
    assert.equal(stale.status, 1)
    assert.match(stale.stdout, /stale/)
  })

  it('CLI: bad usage or an unresolvable base exits 2 with a fetch hint', () => {
    const repo = featureRepo()
    assert.equal(runScript('pr-precheck-seal.mjs', { args: [], cwd: repo }).status, 2)
    const r = runScript('pr-precheck-seal.mjs', { args: ['check', 'nope'], cwd: repo })
    assert.equal(r.status, 2)
    assert.match(r.stderr, /git fetch origin nope/)
  })
})
