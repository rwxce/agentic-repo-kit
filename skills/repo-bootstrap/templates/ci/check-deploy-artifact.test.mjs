import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { collectEntries, firstErrorLine, formatBuildErrors, isExternalPackage, parseExternals } from './check-deploy-artifact.mjs'

const SCRIPT = fileURLToPath(new URL('./check-deploy-artifact.mjs', import.meta.url))
const dirs = []
const tmp = () => {
  const d = mkdtempSync(join(tmpdir(), 'deploy-artifact-'))
  dirs.push(d)
  return d
}
after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })))

describe('check-deploy-artifact: collectEntries', () => {
  it('walks subdirectories, keeps sources and drops tests and node_modules', () => {
    const root = tmp()
    for (const f of ['a.ts', 'nested/b.tsx', 'nested/b.test.ts', 'c.spec.mjs', 'readme.md', 'node_modules/x/index.js']) {
      mkdirSync(join(root, f, '..'), { recursive: true })
      writeFileSync(join(root, f), '')
    }
    assert.deepEqual(collectEntries(root).map((p) => p.slice(root.length + 1)), ['a.ts', 'nested/b.tsx'])
  })

  it('returns nothing for a missing directory', () => {
    assert.deepEqual(collectEntries(join(tmp(), 'nope')), [])
  })
})

describe('check-deploy-artifact: isExternalPackage', () => {
  it('externalises npm packages, scoped or not', () => {
    assert.equal(isExternalPackage('some-sdk', 'import-statement'), true)
    assert.equal(isExternalPackage('@scope/pkg/sub', 'import-statement'), true)
  })

  it('keeps relative, absolute, alias imports and entry points internal', () => {
    assert.equal(isExternalPackage('./x', 'import-statement'), false)
    assert.equal(isExternalPackage('/abs/x', 'import-statement'), false)
    assert.equal(isExternalPackage('@/lib/x', 'import-statement'), false)
    assert.equal(isExternalPackage('~/x', 'import-statement', ['~/']), false)
    assert.equal(isExternalPackage('some-sdk', 'entry-point'), false)
  })
})

describe('check-deploy-artifact: parseExternals', () => {
  it('reads the quoted names of the externals list', () => {
    const src = `export default { build: { external: ["native-a", 'native-b'], other: [] } }`
    assert.deepEqual(parseExternals(src), ['native-a', 'native-b'])
  })

  it('accepts a custom pattern and fails loudly when the list is missing', () => {
    assert.deepEqual(parseExternals('keep = ["x"]', /keep\s*=\s*\[([^\]]*)\]/), ['x'])
    assert.throws(() => parseExternals('export default {}'), /no externals list/)
  })
})

describe('check-deploy-artifact: error formatting', () => {
  it('prints file:line for each bundler error', () => {
    const err = { errors: [{ text: 'Could not resolve "../generated/api"', location: { file: 'worker/job.ts', line: 3 } }, { text: 'boom' }] }
    assert.deepEqual(formatBuildErrors(err), ['worker/job.ts:3: Could not resolve "../generated/api"', '?:?: boom'])
    assert.deepEqual(formatBuildErrors(new Error('plain')), ['plain'])
  })

  it('picks the meaningful line of a crashed smoke run', () => {
    assert.equal(firstErrorLine("at foo\nError: ENOENT: no such file, open '/out/hb.wasm'\n  at bar"), "Error: ENOENT: no such file, open '/out/hb.wasm'")
    assert.equal(firstErrorLine('weird output'), 'weird output')
    assert.equal(firstErrorLine(''), 'smoke entry exited non-zero')
  })
})

describe('check-deploy-artifact: CLI', () => {
  it('fails with a pointer to CONFIG when the bundler cannot be resolved', () => {
    const r = spawnSync(process.execPath, [SCRIPT], { cwd: tmp(), encoding: 'utf8', env: { ...process.env, NODE_PATH: '' } })
    // Either esbuild is missing, or (if it resolves globally) the placeholder entry dir is empty.
    assert.equal(r.status, 1)
    assert.match(r.stderr, /esbuild not found|no entry points/)
  })
})
