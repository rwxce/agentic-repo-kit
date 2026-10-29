import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isOutwardWrite, commandFromHookInput } from './block-outward-writes.mjs'
import { runScript } from './_helpers.mjs'

describe('block-outward-writes', () => {
  const blocked = [
    'gh pr review 345 --approve --body "LGTM"',
    'gh pr review --approve',
    'gh pr review 345 -a -b "ok"',
    'gh pr review 345 -ab "ok"',
    'gh api repos/org/repo/pulls/345/comments -f body="finding"',
    'gh api repos/org/repo/pulls/345/comments --raw-field body=x',
    'gh api repos/org/repo/pulls/345/reviews --method POST --input review.json',
    'gh api -X PATCH repos/org/repo/issues/comments/1 -f body="edit"',
    'gh api repos/o/r/issues/1 --method=DELETE',
    "gh api graphql -f query='mutation { addPullRequestReview(input: {}) { clientMutationId } }'",
    'curl -X POST https://api.github.com/repos/org/repo/pulls/345/comments -d @review.json',
    'curl --data @review.json https://api.github.com/repos/org/repo/pulls/345/reviews',
    'cd x && gh pr review 3 --approve',
  ]
  const allowed = [
    'gh pr view 345 --json files,reviews,comments',
    'gh pr diff 345',
    'gh pr comment 345 --body "AI review"',
    'gh pr review 345 --comment --body "finding"',
    'gh pr review 345 --request-changes --body "x"',
    'gh issue comment 345 --body-file /tmp/review.md',
    'gh api repos/org/repo/pulls/345/comments --paginate',
    "gh api graphql -f query='query { repository(owner: \"org\", name: \"repo\") { name } }'",
    'gh pr create --base dev --title "feat: example" --body "approved preview"',
    'curl https://api.github.com/repos/org/repo/pulls/345/comments',
    'git commit -m "approve the plan"',
    '',
  ]
  for (const c of blocked) it(`blocks ${c}`, () => assert.equal(isOutwardWrite(c), true))
  for (const c of allowed) it(`allows ${JSON.stringify(c)}`, () => assert.equal(isOutwardWrite(c), false))

  it('ignores non-string input', () => {
    assert.equal(isOutwardWrite(undefined), false)
    assert.equal(isOutwardWrite(42), false)
  })

  it('honors extraPatterns', () => {
    assert.equal(isOutwardWrite('gh pr comment 1 -b x', { extraPatterns: ['gh\\s+pr\\s+comment'] }), true)
  })

  it('reads the command from the supported payload shapes', () => {
    assert.equal(commandFromHookInput({ tool_input: { command: 'a' } }), 'a')
    assert.equal(commandFromHookInput({ toolInput: { command: 'b' } }), 'b')
    assert.equal(commandFromHookInput({}), '')
  })

  it('exits 2 with a stderr message when blocking', () => {
    const stdin = JSON.stringify({ tool_input: { command: 'gh pr review 1 --approve' } })
    const r = runScript('block-outward-writes.mjs', { stdin })
    assert.equal(r.status, 2)
    assert.match(r.stderr, /Blocked by repository policy/)
  })

  it('exits 0 silently for safe commands and malformed stdin', () => {
    assert.equal(runScript('block-outward-writes.mjs', { stdin: JSON.stringify({ tool_input: { command: 'ls' } }) }).status, 0)
    assert.equal(runScript('block-outward-writes.mjs', { stdin: 'not json' }).status, 0)
    assert.equal(runScript('block-outward-writes.mjs', { stdin: '' }).status, 0)
  })
})
