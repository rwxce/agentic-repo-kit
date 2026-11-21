import assert from 'node:assert/strict'
import { existsSync, utimesSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { CONFIG, needsUpdate, refresh, relevantFiles } from './index-refresh.mjs'
import { makeRepo, put, runScript } from './_helpers.mjs'

describe('index-refresh: pure parts', () => {
  it('keeps source files outside the index dir', () => {
    assert.deepEqual(relevantFiles(['src/a.ts', 'README.md', '.code-index/graph.json', ' lib/b.py ', '']), ['src/a.ts', 'lib/b.py'])
  })
  it('updates when a candidate is newer than the index or a source file was deleted', () => {
    const mtimeOf = (f) => ({ 'a.ts': 200, 'b.ts': 50 })[f] ?? null
    assert.equal(needsUpdate({ candidates: [], indexMtime: 100, mtimeOf, deleted: [] }), false)
    assert.equal(needsUpdate({ candidates: ['a.ts'], indexMtime: 100, mtimeOf, deleted: [] }), true)
    assert.equal(needsUpdate({ candidates: ['b.ts'], indexMtime: 100, mtimeOf, deleted: [] }), false)
    assert.equal(needsUpdate({ candidates: ['b.ts'], indexMtime: 100, mtimeOf, deleted: ['gone.ts'] }), true)
    assert.equal(needsUpdate({ candidates: ['b.ts'], indexMtime: 100, mtimeOf, deleted: ['gone.md'] }), false)
  })
})

describe('index-refresh: refresh (integration)', () => {
  // A fake index CLI: `node fake.mjs` writes a marker. `node --help` succeeds, so the probe passes.
  const withFake = (repo) => {
    put(repo, { 'fake.mjs': "import { writeFileSync } from 'node:fs'; writeFileSync('.code-index/updated', 'x'); console.log('index updated')\n" })
    return { ...CONFIG, updateCommand: ['node', join(repo, 'fake.mjs')] }
  }

  it('reports a missing CLI', () => {
    const repo = makeRepo()
    const lines = refresh(repo, { ...CONFIG, updateCommand: ['definitely-not-a-cli-xyz', 'update'] })
    assert.match(lines[0], /not installed/)
  })

  it('reports a missing index', () => {
    const repo = makeRepo()
    assert.match(refresh(repo, withFake(repo))[0], /no index yet/)
  })

  it('stays silent without relevant changes, updates when a source file is newer', () => {
    const repo = makeRepo({ 'a.ts': 'a\n', '.gitignore': '.code-index/\nfake.mjs\n' })
    const config = withFake(repo)
    put(repo, { '.code-index/graph.json': '{}' })
    assert.deepEqual(refresh(repo, config), [])
    put(repo, { 'a.ts': 'changed\n' })
    const past = new Date(Date.now() - 60_000)
    utimesSync(join(repo, '.code-index/graph.json'), past, past)
    const lines = refresh(repo, config)
    assert.match(lines[0], /1 changed source file/)
    assert.ok(existsSync(join(repo, '.code-index/updated')))
  })

  it('CLI always exits 0', () => {
    assert.equal(runScript('index-refresh.mjs', { cwd: makeRepo() }).status, 0)
  })
})
