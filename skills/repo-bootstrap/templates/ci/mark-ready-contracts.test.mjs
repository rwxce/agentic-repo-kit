import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { doneMigrations, marker, normalize, planActions } from './mark-ready-contracts.mjs'

const issue = (number, title, extra = {}) => ({ number, title, labels: [], comments: [], ...extra })

describe('mark-ready-contracts: normalize / doneMigrations', () => {
  it('strips a module prefix and accepts done or isDone', () => {
    assert.deepEqual(normalize({ name: 'migrations:backfillPlan', isDone: true, state: 'success', processed: 3 }), {
      name: 'backfillPlan',
      done: true,
      state: 'success',
      processed: 3,
    })
    assert.equal(normalize({ name: 'x', done: true, state: 'Completed' }).state, 'completed')
  })

  it('keeps only finished, successful migrations', () => {
    const done = doneMigrations([
      { name: 'a', isDone: true, state: 'success' },
      { name: 'b', isDone: false, state: 'inProgress' },
      { name: 'c', isDone: true, state: 'failed' },
      { name: 'd', done: true, state: 'done' },
    ])
    assert.deepEqual([...done.keys()], ['a', 'd'])
  })

  it('accepts an object keyed by name and garbage without throwing', () => {
    assert.deepEqual([...doneMigrations({ x: { name: 'x', done: true, state: 'success' } }).keys()], ['x'])
    assert.equal(doneMigrations(null).size, 0)
  })
})

describe('mark-ready-contracts: planActions', () => {
  const statuses = [
    { name: 'migrations:dropLegacyField', isDone: true, state: 'success', processed: 12 },
    { name: 'migrations:stillRunning', isDone: false, state: 'inProgress' },
  ]

  it('labels and comments the issue of a finished migration', () => {
    const [a, ...rest] = planActions([issue(7, 'Contract: dropLegacyField'), issue(8, 'Contract: stillRunning')], statuses)
    assert.equal(rest.length, 0)
    assert.equal(a.number, 7)
    assert.equal(a.addLabel, true)
    assert.match(a.comment, /^<!-- contract-ready:dropLegacyField -->/)
    assert.match(a.comment, /12 record\(s\) processed/)
  })

  it('is idempotent: nothing to do once labelled and commented', () => {
    const done = issue(7, 'Contract: dropLegacyField', {
      labels: [{ name: 'contract-ready' }],
      comments: [{ body: `${marker('dropLegacyField')}\nalready said` }],
    })
    assert.deepEqual(planActions([done], statuses), [])
  })

  it('completes a half-done issue (label present, comment missing, or the reverse)', () => {
    const labelled = issue(7, 'Contract: dropLegacyField', { labels: [{ name: 'contract-ready' }] })
    const [a] = planActions([labelled], statuses)
    assert.equal(a.addLabel, false)
    assert.ok(a.comment)
    const commented = issue(7, 'Contract: dropLegacyField', { comments: [{ body: marker('dropLegacyField') }] })
    const [b] = planActions([commented], statuses)
    assert.equal(b.addLabel, true)
    assert.equal(b.comment, null)
  })

  it('ignores titles that do not follow the exact format', () => {
    assert.deepEqual(planActions([issue(1, 'contract: dropLegacyField'), issue(2, 'Contract: dropLegacyField later')], statuses), [])
  })

  it('omits the processed count when the tool does not report it', () => {
    const [a] = planActions([issue(3, 'Contract: x')], [{ name: 'x', done: true, state: 'success' }])
    assert.doesNotMatch(a.comment, /processed/)
  })
})
