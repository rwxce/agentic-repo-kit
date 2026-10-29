import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildMessage, run } from './branch-policy.mjs'
import { makeRepo, put, git } from './_helpers.mjs'

const commit = (repo, name) => {
  put(repo, { [name]: name })
  git(repo, 'add', '-A')
  git(repo, 'commit', '-qm', `add ${name}`)
}

describe('branch-policy', () => {
  it('is silent on a feature branch even with commits ahead', () => {
    const repo = makeRepo({ 'a.js': 'a' })
    git(repo, 'checkout', '-qb', 'feat/x')
    commit(repo, 'b.js')
    assert.equal(run(repo), '')
  })

  it('is silent on a protected branch that is level with its remote', () => {
    assert.equal(run(makeRepo()), '')
  })

  it('is silent when the remote counterpart does not exist', () => {
    const repo = makeRepo({ 'a.js': 'a' }, 'main')
    git(repo, 'update-ref', '-d', 'refs/remotes/origin/main')
    commit(repo, 'b.js')
    assert.equal(run(repo), '')
  })

  it('warns on main with a local commit ahead', () => {
    const repo = makeRepo()
    commit(repo, 'oops.js')
    const out = run(repo)
    assert.match(out, /on 'main'/)
    assert.match(out, /add oops\.js/)
    assert.match(out, /release\/merge process/)
  })

  it('uses the softer integration-branch hint on dev', () => {
    const repo = makeRepo({ 'a.js': 'a' }, 'dev')
    commit(repo, 'x.js')
    assert.match(run(repo), /bypass PR review/)
  })

  it('honors a custom protected list and docs path', () => {
    const repo = makeRepo({ 'a.js': 'a' }, 'trunk')
    commit(repo, 'x.js')
    assert.equal(run(repo), '')
    const cfg = { remote: 'origin', protectedBranches: ['trunk'], integrationBranches: [], docsPath: 'docs/release.md' }
    assert.match(run(repo, cfg), /docs\/release\.md/)
  })

  it('buildMessage lists every ahead commit', () => {
    assert.match(buildMessage('main', 'origin/main', 'a1 one\nb2 two'), /a1 one[\s\S]*b2 two/)
  })
})
