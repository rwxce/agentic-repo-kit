import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { scanDiff, run } from './compliance-tripwire.mjs'
import { makeRepo, put } from './_helpers.mjs'

const added = (file, ...lines) => `+++ b/${file}\n@@ -0,0 +1 @@\n${lines.map((l) => `+${l}`).join('\n')}\n`
const labels = (diff) => [...scanDiff(diff).keys()]

describe('compliance-tripwire: content', () => {
  it('flags analytics / tracking SDKs', () => {
    assert.match(labels(added('a.ts', "import posthog from 'posthog-js'"))[0], /third party/)
    assert.match(labels(added('a.ts', "gtag('event', 'x')"))[0], /third party/)
    assert.match(labels(added('a.py', 'import sentry_sdk'))[0], /third party/)
  })
  it('flags device storage', () => {
    assert.match(labels(added('a.ts', "document.cookie = 'x=1'"))[0], /device/)
    assert.match(labels(added('a.ts', "localStorage.setItem('k','v')"))[0], /device/)
  })
  it('flags consent bypasses', () => {
    assert.match(labels(added('a.ts', 'const bypassConsent = true'))[0], /consent/)
  })
  it('flags new persisted models and outbound hosts', () => {
    assert.match(labels(added('s.ts', 'export const users = pgTable("users", {})'))[0], /persisted/)
    assert.match(labels(added('s.prisma', 'model Customer {'))[0], /persisted/)
    assert.match(labels(added('a.ts', "await fetch('https://api.vendor.io/x')"))[0], /outbound/)
    assert.match(labels(added('a.py', "requests.post('https://vendor.io')"))[0], /outbound/)
  })
  it('ignores relative fetches and unrelated code', () => {
    assert.deepEqual(labels(added('a.ts', "await fetch('/api/me')")), [])
    assert.deepEqual(labels(added('a.ts', 'const total = a + b')), [])
  })
  it('only looks at ADDED lines', () => {
    assert.deepEqual(labels('+++ b/a.ts\n@@\n-posthog.capture("x")\n'), [])
  })
  it('skips tests, markdown, lockfiles and vendored paths', () => {
    assert.deepEqual(labels(added('a.test.ts', "localStorage.setItem('k','v')")), [])
    assert.deepEqual(labels(added('docs/a.md', 'posthog')), [])
    assert.deepEqual(labels(added('node_modules/x/i.js', 'posthog')), [])
    assert.deepEqual(labels(added('pnpm-lock.yaml', 'posthog')), [])
  })
  it('groups files per label', () => {
    const hits = scanDiff(added('a.ts', 'localStorage.x') + added('b.ts', 'sessionStorage.y'))
    assert.deepEqual([...[...hits.values()][0]].sort(), ['a.ts', 'b.ts'])
  })
})

describe('compliance-tripwire: paths', () => {
  it('flags consent, legal and compliance paths even with an innocuous body', () => {
    assert.ok(labels(added('components/cookie-consent.tsx', 'x')).includes('Consent logic'))
    assert.ok(labels(added('app/legal/privacy/page.tsx', 'x')).includes('Published legal text'))
    assert.ok(labels(added('compliance/inventory.md', 'x')).includes('Compliance records'))
  })
  it('does not flag a path merely containing "legal" as a word fragment', () => {
    assert.deepEqual(labels(added('src/illegally.ts', 'x')), [])
  })
})

describe('compliance-tripwire: run (integration)', () => {
  it('reports on a working-tree change and is silent for a clean tree', () => {
    const repo = makeRepo({ 'a.js': 'x\n' })
    assert.equal(run(repo), '')
    put(repo, { 'a.js': 'x\nlocalStorage.setItem("a","b")\n' })
    const out = run(repo)
    assert.match(out, /Compliance tripwire/)
    assert.match(out, /a\.js/)
  })
  it('caps the files listed', () => {
    const files = {}
    for (let i = 0; i < 7; i++) files[`f${i}.js`] = 'x\n'
    const repo = makeRepo(files)
    for (let i = 0; i < 7; i++) files[`f${i}.js`] = 'localStorage.x\n'
    put(repo, files)
    assert.match(run(repo), /\+3 more/)
  })
})
