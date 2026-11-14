import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { reviewSealStatus, writeReviewSeal } from './review-seal.mjs'
import { git, makeRepo, put, runScript } from './_helpers.mjs'

/** A repo on `main` (origin/main = base) with a feature branch carrying one change. */
function featureRepo() {
  const repo = makeRepo({ '.gitignore': '.context/\n', 'a.txt': 'a\n' }, 'main')
  git(repo, 'checkout', '-qb', 'feat/x')
  put(repo, { 'a.txt': 'changed\n' })
  return repo
}

describe('review-seal', () => {
  it('is missing, then fresh after write, then stale when the diff changes', () => {
    const repo = featureRepo()
    assert.equal(reviewSealStatus(repo, 'feat/x'), 'missing')
    writeReviewSeal(repo, 'feat/x')
    assert.equal(reviewSealStatus(repo, 'feat/x'), 'fresh')
    git(repo, 'add', '-A')
    git(repo, 'commit', '-qm', 'same diff, committed')
    assert.equal(reviewSealStatus(repo, 'feat/x'), 'fresh')
    put(repo, { 'b.txt': 'new\n' })
    assert.equal(reviewSealStatus(repo, 'feat/x'), 'stale')
  })

  it('CLI: check exits 1 when missing, write then check exits 0', () => {
    const repo = featureRepo()
    assert.equal(runScript('review-seal.mjs', { args: ['check'], cwd: repo }).status, 1)
    assert.equal(runScript('review-seal.mjs', { args: ['write'], cwd: repo }).status, 0)
    const ok = runScript('review-seal.mjs', { args: ['check'], cwd: repo })
    assert.equal(ok.status, 0)
    assert.match(ok.stdout, /fresh/)
  })

  it('CLI: bad usage or an unknown base exits 2', () => {
    const repo = featureRepo()
    assert.equal(runScript('review-seal.mjs', { args: ['nope'], cwd: repo }).status, 2)
    assert.equal(runScript('review-seal.mjs', { args: ['check', 'no-such-base'], cwd: repo }).status, 2)
  })
})
