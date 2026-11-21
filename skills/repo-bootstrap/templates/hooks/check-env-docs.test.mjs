import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { envReads, findUndocumented, run } from './check-env-docs.mjs'
import { makeRepo, put, git } from './_helpers.mjs'

const docs = 'Variables:\n- `STRIPE_KEY` — billing\n- DATABASE_URL\n'
const addedLine = (file, line) => `+++ b/${file}\n@@ -0,0 +1 @@\n+${line}\n`

describe('check-env-docs: readers', () => {
  const read = (s) => envReads(s)
  it('finds reads across stacks', () => {
    assert.deepEqual(read('const a = process.env.FOO_BAR'), ['FOO_BAR'])
    assert.deepEqual(read('process.env["X_1"]'), ['X_1'])
    assert.deepEqual(read('import.meta.env.VITE_URL'), ['VITE_URL'])
    assert.deepEqual(read('os.environ.get("PY_VAR")'), ['PY_VAR'])
    assert.deepEqual(read('os.environ["PY2"]'), ['PY2'])
    assert.deepEqual(read('os.getenv("PY3")'), ['PY3'])
    assert.deepEqual(read('os.Getenv("GO_VAR")'), ['GO_VAR'])
    assert.deepEqual(read('ENV["RB_VAR"]'), ['RB_VAR'])
    assert.deepEqual(read('env::var("RS_VAR")'), ['RS_VAR'])
  })
  it('ignores lowercase names and non-reads', () => {
    assert.deepEqual(read('process.env.lower'), [])
    assert.deepEqual(read('const env = {}'), [])
  })
})

describe('check-env-docs: findUndocumented', () => {
  it('reports an undocumented var from added diff lines', () => {
    const hits = findUndocumented({ diff: addedLine('src/a.ts', 'const k = process.env.NEW_SECRET'), docs })
    assert.deepEqual([...hits.keys()], ['NEW_SECRET'])
    assert.deepEqual([...hits.get('NEW_SECRET')], ['src/a.ts'])
  })
  it('accepts documented vars, backticked or plain', () => {
    assert.equal(findUndocumented({ diff: addedLine('a.ts', 'process.env.STRIPE_KEY'), docs }).size, 0)
    assert.equal(findUndocumented({ diff: addedLine('a.ts', 'process.env.DATABASE_URL'), docs }).size, 0)
  })
  it('does not treat a longer documented name as covering a shorter one', () => {
    assert.equal(findUndocumented({ diff: addedLine('a.ts', 'process.env.KEY'), docs }).size, 1)
  })
  it('ignores removed lines, tests, markdown and vendored paths', () => {
    assert.equal(findUndocumented({ diff: '+++ b/a.ts\n-const k = process.env.OLD_ONE\n', docs }).size, 0)
    assert.equal(findUndocumented({ diff: addedLine('src/a.test.ts', 'process.env.TEST_ONLY'), docs }).size, 0)
    assert.equal(findUndocumented({ diff: addedLine('docs/x.md', 'process.env.PROSE'), docs }).size, 0)
    assert.equal(findUndocumented({ diff: addedLine('node_modules/p/i.js', 'process.env.VENDORED'), docs }).size, 0)
  })
  it('scans untracked files in full', () => {
    const hits = findUndocumented({ diff: '', untracked: [{ file: 'src/new.ts', contents: 'x\nprocess.env.FRESH_VAR\n' }], docs })
    assert.ok(hits.has('FRESH_VAR'))
  })
})

describe('check-env-docs: run (integration)', () => {
  it('flags a fresh untracked file and a modified file; silent when documented', () => {
    const repo = makeRepo({ 'docs/environment-variables.md': '`KNOWN`\n', 'a.js': 'x\n' })
    assert.equal(run(repo), '')
    put(repo, { 'a.js': 'const v = process.env.KNOWN\nconst w = process.env.UNKNOWN_ONE\n', 'b.js': 'process.env.UNTRACKED_ONE' })
    const out = run(repo)
    assert.match(out, /UNKNOWN_ONE/)
    assert.match(out, /UNTRACKED_ONE/)
    assert.doesNotMatch(out, /KNOWN\b(?!_)/)
  })
  it('is silent without a docs file', () => {
    const repo = makeRepo({ 'a.js': 'x\n' })
    put(repo, { 'a.js': 'process.env.SOMETHING' })
    assert.equal(run(repo), '')
  })
  it('sees committed-on-branch changes relative to the base', () => {
    const repo = makeRepo({ 'docs/environment-variables.md': 'none\n', 'a.js': 'x\n' })
    git(repo, 'checkout', '-qb', 'feat')
    put(repo, { 'a.js': 'process.env.BRANCH_VAR\n' })
    git(repo, 'commit', '-qam', 'work')
    assert.match(run(repo), /BRANCH_VAR/)
  })
})
