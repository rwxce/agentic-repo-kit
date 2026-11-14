// Zero-dependency tests. Run: node --test automations/
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { checkSkill, checkSkillsDir, isVendored, MAX_LINES, parseFrontmatter } from './check-skills.mjs'

const skill = (fm, body = 'Body.') => `---\n${fm}\n---\n\n${body}\n`
const vendored = ['vendor-*', 'upstream-skill']

test('parseFrontmatter reads scalar, quoted and folded values', () => {
  const fm = parseFrontmatter(skill('name: a\ndescription: >-\n  first line\n  second line\ntargets: ["*"]'))
  assert.equal(fm.name, 'a')
  assert.equal(fm.description, 'first line second line')
  const q = parseFrontmatter(skill('name: "b"\ndescription: \'quoted\''))
  assert.equal(q.name, 'b')
  assert.equal(q.description, 'quoted')
})

test('parseFrontmatter returns null without frontmatter', () => {
  assert.equal(parseFrontmatter('# no frontmatter'), null)
})

test('passes a well-formed skill', () => {
  assert.deepEqual(checkSkill('ok', skill('name: ok\ndescription: Does a thing. Use when X.')), [])
})

test('fails a skill without description', () => {
  assert.deepEqual(checkSkill('fresh', skill('name: fresh')), ['fresh: missing description'])
})

test('fails an own skill that is too long or too wordy', () => {
  const long = skill('name: big\ndescription: short', 'x\n'.repeat(MAX_LINES))
  assert.match(checkSkill('big', long)[0], /lines \(max 500\)/)
  const wordy = skill(`name: w\ndescription: ${'word '.repeat(151)}`)
  assert.match(checkSkill('w', wordy)[0], /151 words/)
})

test('exempts vendored skills from the size limits, not from frontmatter', () => {
  const long = skill('name: vendor-design\ndescription: d', 'x\n'.repeat(MAX_LINES))
  assert.deepEqual(checkSkill('vendor-design', long, vendored), [])
  assert.deepEqual(checkSkill('upstream-skill', '# none', vendored), ['upstream-skill: missing frontmatter'])
})

test('matches vendored prefixes; nothing is vendored by default', () => {
  assert.equal(isVendored('vendor-anything', vendored), true)
  assert.equal(isVendored('plan-feature', vendored), false)
  assert.equal(isVendored('vendor-anything'), false)
})

test('checkSkillsDir reports a skill folder without SKILL.md', () => {
  const dir = mkdtempSync(join(tmpdir(), 'skills-'))
  try {
    mkdirSync(join(dir, 'empty'))
    mkdirSync(join(dir, 'good'))
    writeFileSync(join(dir, 'good', 'SKILL.md'), skill('name: good\ndescription: fine'))
    assert.deepEqual(checkSkillsDir(dir), ['empty: missing SKILL.md'])
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
