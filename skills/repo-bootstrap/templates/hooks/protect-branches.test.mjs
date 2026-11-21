import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { checkCommand, CONFIG } from './protect-branches.mjs'
import { runScript } from './_helpers.mjs'

const ctx = {
  protectedBranches: ['main', 'develop', 'staging', 'feat/in-progress'],
  baseBranches: ['main', 'develop', 'staging'],
  currentBranch: 'feat/other',
  worktrees: { 'feat/in-progress': '/ws/alpha', develop: '/ws/beta' },
  cwd: '/ws/gamma',
}

describe('protect-branches: blocks', () => {
  for (const command of [
    'git branch -D develop',
    'git branch -d feat/in-progress',
    'git branch --delete --force main',
    'git branch -m staging old-staging',
    'git branch -f develop HEAD~3',
    'git -C /ws/x branch -D feat/in-progress',
    'for b in a feat/in-progress; do git branch -D $b; done; git branch -D feat/in-progress',
    'git push origin --delete feat/in-progress',
    'git push origin -d develop',
    'git push origin :staging',
    'git push origin +HEAD:main',
    'git push --force origin feat/in-progress',
    'git push -f origin HEAD:refs/heads/develop',
    'git update-ref -d refs/heads/main',
    'git checkout -B develop origin/main',
    'git switch -C feat/in-progress',
    'git worktree remove /ws/alpha',
    'git worktree remove ../beta',
    'gh api -X DELETE repos/acme/app/git/refs/heads/develop',
  ]) {
    it(command, () => assert.notEqual(checkCommand(command, ctx), null))
  }

  for (const command of ['git reset --hard origin/develop', 'git rebase origin/main', 'git commit --amend --no-edit', 'git push --force']) {
    it(`${command} while on a base branch`, () => assert.notEqual(checkCommand(command, { ...ctx, currentBranch: 'develop' }), null))
  }

  it('renaming the current protected branch', () => {
    assert.notEqual(checkCommand('git branch -m new-name', { ...ctx, currentBranch: 'feat/in-progress' }), null)
  })
})

describe('protect-branches: lets run', () => {
  for (const command of [
    'git branch -D feat/other',
    'git branch',
    'git branch -vv',
    'git push origin feat/in-progress',
    'git push -u origin feat/other',
    'git push --force origin feat/other',
    'git push origin --delete feat/other',
    'git fetch origin develop',
    'git checkout develop',
    'git merge --ff-only origin/develop',
    'git reset --hard origin/develop',
    'git worktree remove /ws/delta',
    'git log main..develop',
    'echo git branch -D',
    '',
  ]) {
    it(JSON.stringify(command), () => assert.equal(checkCommand(command, ctx), null))
  }

  it('defaults protect CONFIG.baseBranches', () => {
    assert.ok(CONFIG.baseBranches.includes('main'))
    assert.notEqual(checkCommand('git branch -D main', { protectedBranches: CONFIG.baseBranches }), null)
  })
})

describe('protect-branches: CLI', () => {
  it('malformed stdin exits 0', () => {
    assert.equal(runScript('protect-branches.mjs', { stdin: 'nope' }).status, 0)
  })
  it('non-git commands exit 0 silently', () => {
    const r = runScript('protect-branches.mjs', { stdin: JSON.stringify({ tool_input: { command: 'ls -la' } }) })
    assert.equal(r.status, 0)
    assert.equal(r.stderr, '')
  })
  it('blocks deleting main with exit 2', () => {
    const r = runScript('protect-branches.mjs', { stdin: JSON.stringify({ tool_input: { command: 'git branch -D main' } }) })
    assert.equal(r.status, 2)
    assert.match(r.stderr, /Blocked: .*main/)
  })
})
