// Zero-dependency tests. Run: node --test ci/plan-folder/
import test from 'node:test'
import assert from 'node:assert/strict'
import { closedPlans, planCloseProblems } from './check-plan-close.mjs'

const removed = (filename) => ({ filename, status: 'removed' })
const gone = () => false
const present = () => true
const check = (body, files, folderExistsAtHead) => planCloseProblems({ body, files, folderExistsAtHead })

test('closedPlans reads every marker, ignoring case and surrounding space', () => {
  assert.deepEqual(closedPlans('Intro\n  closes-plan: billing-revamp  \r\nCloses-plan: other\nEnd'), ['billing-revamp', 'other'])
})

test('closedPlans returns nothing for an empty body or a mention inside a sentence', () => {
  assert.deepEqual(closedPlans(null), [])
  assert.deepEqual(closedPlans('This never uses Closes-plan: here in the middle of a line'), [])
})

test('accepts a PR that does not touch plans', () => {
  assert.deepEqual(check('', [{ filename: 'src/orders.ts', status: 'modified' }], gone), [])
})

test('accepts a marker with the whole folder deleted', () => {
  const files = [removed('docs/plans/billing-revamp/plan.md'), removed('docs/plans/billing-revamp/decisions.md')]
  assert.deepEqual(check('Closes-plan: billing-revamp', files, gone), [])
})

test('accepts a normal edit of one file in a live plan', () => {
  assert.deepEqual(check('', [{ filename: 'docs/plans/billing-revamp/decisions.md', status: 'modified' }], present), [])
})

test('accepts removing a finished subplan while the folder lives on', () => {
  assert.deepEqual(check('', [removed('docs/plans/billing-revamp/step-1.md')], present), [])
})

test('rejects a marker that deletes nothing, such as a typo', () => {
  const problems = check('Closes-plan: billing-revam', [removed('docs/plans/billing-revamp/plan.md')], gone)
  assert.match(problems.join(' '), /removes nothing under docs\/plans\/billing-revam\//)
})

test('rejects a marker that leaves files behind', () => {
  const problems = check('Closes-plan: billing-revamp', [removed('docs/plans/billing-revamp/plan.md')], present)
  assert.match(problems.join(' '), /still has files/)
})

test('rejects deleting a whole folder without the marker', () => {
  const problems = check('', [removed('docs/plans/billing-revamp/plan.md')], gone)
  assert.match(problems.join(' '), /without a "Closes-plan: billing-revamp" line/)
})

test('rejects an empty or invalid marker', () => {
  assert.equal(check('Closes-plan:', [], gone).length, 1)
  assert.equal(check('Closes-plan: ../x', [], gone).length, 1)
})

test('counts a file renamed out of the folder as removed', () => {
  const files = [{ filename: 'docs/architecture.md', status: 'renamed', previous_filename: 'docs/plans/billing-revamp/plan.md' }]
  assert.match(check('', files, gone).join(' '), /without a "Closes-plan: billing-revamp" line/)
})

test('accepts a correct close done with git mv', () => {
  const files = [
    { filename: 'docs/architecture.md', status: 'renamed', previous_filename: 'docs/plans/billing-revamp/plan.md' },
    removed('docs/plans/billing-revamp/decisions.md'),
  ]
  assert.deepEqual(check('Closes-plan: billing-revamp', files, gone), [])
})

test('does not treat moving a folder inside the plans dir as a closure', () => {
  const files = [{ filename: 'docs/plans/new-name/plan.md', status: 'renamed', previous_filename: 'docs/plans/old-name/plan.md' }]
  assert.deepEqual(check('', files, gone), [])
})

test('ignores files sitting directly under the plans dir', () => {
  assert.deepEqual(check('', [removed('docs/plans/README.md')], gone), [])
})

test('honours a custom plans prefix', () => {
  const problems = planCloseProblems({ body: '', files: [removed('plans/x/plan.md')], folderExistsAtHead: gone, prefix: 'plans/' })
  assert.match(problems.join(' '), /plans\/x\/ is deleted/)
})
