// Guard test for the concept catalog in skills/repo-bootstrap/references/.
// Fails when a card loses one of its eight fields, is missing from concept-catalog.md, is not
// reachable from the "Project signal → concepts" table in decision-matrix.md, or has a broken
// relative link.
// Run: node --test tests/*.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const refs = join(root, 'skills/repo-bootstrap/references')
const conceptsDir = join(refs, 'concepts')

export const FIELDS = [
  'Problem',
  'Principle',
  'When it applies',
  "When it doesn't",
  'Typical mistakes',
  'The check that verifies it',
  'Canonical source',
  'Variants per stack',
]

const cards = readdirSync(conceptsDir)
  .filter((f) => f.endsWith('.md'))
  .sort()
  .map((f) => ({ slug: f.slice(0, -3), file: join(conceptsDir, f), text: readFileSync(join(conceptsDir, f), 'utf8') }))

/** Body of a `## <name>` section, or null when the heading is missing. */
export function section(text, name) {
  const lines = text.split('\n')
  const start = lines.findIndex((l) => l.trim() === `## ${name}`)
  if (start === -1) return null
  const end = lines.findIndex((l, i) => i > start && l.startsWith('## '))
  return lines.slice(start + 1, end === -1 ? undefined : end).join('\n').trim()
}

/** Relative link targets in markdown (`[text](target)`), without anchors; external and anchor-only links skipped. */
export function relativeLinks(text) {
  return [...text.matchAll(/\]\(([^)\s]+)\)/g)]
    .map((m) => m[1])
    .filter((t) => !/^[a-z][a-z0-9+.-]*:/i.test(t) && !t.startsWith('#'))
    .map((t) => t.split('#')[0])
}

test('there are concept cards', () => {
  assert.ok(cards.length > 0, 'no cards in references/concepts/')
})

test('every card has the eight fields, each non-empty', () => {
  const problems = []
  for (const { slug, text } of cards) {
    for (const field of FIELDS) {
      const body = section(text, field)
      if (body === null) problems.push(`${slug}: missing "## ${field}"`)
      else if (!body) problems.push(`${slug}: empty "## ${field}"`)
    }
  }
  assert.deepEqual(problems, [])
})

test('every card is listed in concept-catalog.md', () => {
  const index = readFileSync(join(refs, 'concept-catalog.md'), 'utf8')
  const missing = cards.filter(({ slug }) => !index.includes(`(concepts/${slug}.md)`)).map((c) => c.slug)
  assert.deepEqual(missing, [])
})

test('every card is reachable from the decision-matrix signal table', () => {
  const matrix = readFileSync(join(refs, 'decision-matrix.md'), 'utf8')
  const table = section(matrix, 'Project signal → concepts')
  assert.ok(table, 'decision-matrix.md has no "## Project signal → concepts" section')
  const named = new Set([...table.matchAll(/`([a-z0-9-]+)`/g)].map((m) => m[1]))
  const unreachable = cards.filter(({ slug }) => !named.has(slug)).map((c) => c.slug)
  const unknown = [...named].filter((s) => !cards.some((c) => c.slug === s))
  assert.deepEqual({ unreachable, unknown }, { unreachable: [], unknown: [] })
})

test('every relative link in a card resolves', () => {
  const broken = []
  for (const { slug, file, text } of cards) {
    for (const target of relativeLinks(text)) {
      if (!existsSync(resolve(dirname(file), target))) broken.push(`${slug}: ${target}`)
    }
  }
  assert.deepEqual(broken, [])
})

test('helpers: section and relativeLinks', () => {
  const md = '# T\n\n## A\n\nbody [x](b.md#h) [y](https://e.com) [z](#top)\n\n## B\n'
  assert.equal(section(md, 'A'), 'body [x](b.md#h) [y](https://e.com) [z](#top)')
  assert.equal(section(md, 'B'), '')
  assert.equal(section(md, 'C'), null)
  assert.deepEqual(relativeLinks(md), ['b.md'])
})
