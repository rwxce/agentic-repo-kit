// Zero-dependency tests. Run: node --test automations/
import test from 'node:test'
import assert from 'node:assert/strict'
import { findMismatches, parseOverrides } from './check-dependency-families.mjs'

const families = [
  { name: 'Acme', packages: ['acme-cli', '@acme/sdk', '@acme/core'] },
  { name: 'Widgets', packages: ['@widgets/react', '@widgets/devtools'] },
]
const yaml = `packages:
  - .
overrides:
  '@acme/core': 4.5.9
  qs: 6.16.1
  'brace-expansion@1': 1.1.21
onlyBuiltDependencies:
  '@widgets/cli': true
`

test('reads only the top-level overrides block', () => {
  assert.deepEqual(parseOverrides(yaml), { '@acme/core': '4.5.9', qs: '6.16.1', 'brace-expansion@1': '1.1.21' })
})

test('passes when every present family member shares one version', () => {
  const pkg = { dependencies: { '@acme/sdk': '4.5.9', '@widgets/react': '10.75.2' }, devDependencies: { 'acme-cli': '4.5.9' } }
  assert.deepEqual(findMismatches(pkg, parseOverrides(yaml), families), [])
})

test('flags a lone bump, including the override', () => {
  const pkg = {
    dependencies: { '@acme/sdk': '4.7.4', '@widgets/react': '10.75.2', '@widgets/devtools': '10.76.0' },
    devDependencies: { 'acme-cli': '4.5.9' },
  }
  const mismatches = findMismatches(pkg, parseOverrides(yaml), families)
  assert.deepEqual(mismatches.map((m) => m.family), ['Acme', 'Widgets'])
  assert.ok(mismatches[0].found.some((f) => f.name === '@acme/core' && f.version === '4.5.9'))
})

test('reads package.json overrides too', () => {
  const pkg = { dependencies: { '@acme/sdk': '1.0.0' }, overrides: { '@acme/core': '1.0.1' } }
  assert.equal(findMismatches(pkg, {}, families).length, 1)
})
