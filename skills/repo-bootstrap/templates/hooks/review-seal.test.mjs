import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { computeFingerprint } from './pr-precheck-seal.mjs'
import { reviewSealStatus, snapshotForReview, writeReviewSeal } from './review-seal.mjs'
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
    writeReviewSeal(repo, 'feat/x', 'main', computeFingerprint(repo, 'main'))
    assert.equal(reviewSealStatus(repo, 'feat/x'), 'fresh')
    git(repo, 'add', '-A')
    git(repo, 'commit', '-qm', 'same diff, committed')
    assert.equal(reviewSealStatus(repo, 'feat/x'), 'fresh')
    put(repo, { 'b.txt': 'new\n' })
    assert.equal(reviewSealStatus(repo, 'feat/x'), 'stale')
  })

  it('refuses to seal a diff that changed while the review ran', () => {
    const repo = featureRepo()
    const atStart = computeFingerprint(repo, 'main')
    put(repo, { 'b.txt': 'edited during the review\n' })
    assert.throws(() => writeReviewSeal(repo, 'feat/x', 'main', atStart), /changed since the review started/)
    assert.throws(() => writeReviewSeal(repo, 'feat/x', 'main'), /--expect/)
    assert.equal(reviewSealStatus(repo, 'feat/x'), 'missing')
  })

  it('saves the exact uncommitted diff it fingerprints, and that fingerprint seals it', () => {
    const repo = featureRepo()
    put(repo, { 'new.txt': 'untracked\n' })
    const { fingerprint, file } = snapshotForReview(repo, 'feat/x')
    const diff = readFileSync(file, 'utf8')
    assert.match(diff, /\+changed/)
    assert.match(diff, /\+untracked/)
    assert.equal(fingerprint, computeFingerprint(repo, 'main'))
    writeReviewSeal(repo, 'feat/x', 'main', fingerprint)
    assert.equal(reviewSealStatus(repo, 'feat/x'), 'fresh')
    // The real index is untouched: nothing got staged by the snapshot.
    assert.equal(git(repo, 'diff', '--cached', '--name-only').trim(), '')
  })

  it('CLI: check exits 1 when missing; fingerprint then write --expect then check exits 0', () => {
    const repo = featureRepo()
    assert.equal(runScript('review-seal.mjs', { args: ['check'], cwd: repo }).status, 1)
    assert.equal(runScript('review-seal.mjs', { args: ['write'], cwd: repo }).status, 1)
    const fp = runScript('review-seal.mjs', { args: ['fingerprint'], cwd: repo })
    assert.equal(fp.status, 0)
    const value = fp.stdout.match(/fingerprint: ([0-9a-f]+)/)[1]
    assert.equal(runScript('review-seal.mjs', { args: ['write', '--expect', value], cwd: repo }).status, 0)
    const ok = runScript('review-seal.mjs', { args: ['check'], cwd: repo })
    assert.equal(ok.status, 0)
    assert.match(ok.stdout, /fresh/)
  })

  it('CLI: a stale --expect exits 1 and writes nothing', () => {
    const repo = featureRepo()
    const value = computeFingerprint(repo, 'main')
    put(repo, { 'c.txt': 'late edit\n' })
    const r = runScript('review-seal.mjs', { args: ['write', '--expect', value], cwd: repo })
    assert.equal(r.status, 1)
    assert.match(r.stderr, /changed since the review started/)
    assert.equal(reviewSealStatus(repo, 'feat/x'), 'missing')
  })

  it('CLI: bad usage or an unknown base exits 2', () => {
    const repo = featureRepo()
    assert.equal(runScript('review-seal.mjs', { args: ['nope'], cwd: repo }).status, 2)
    assert.equal(runScript('review-seal.mjs', { args: ['check', 'no-such-base'], cwd: repo }).status, 2)
  })
})
