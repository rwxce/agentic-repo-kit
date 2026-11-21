// Guard for content-registry.ts. Runs with `node --test` (Node >= 22.18 strips the types) or under
// Vitest/Jest (swap the node:test imports). In the target repo, import the real messages files and
// use the real date: TODAY = new Date(). The fixed date below exists only so the kit's own sample
// data does not go stale in the kit's CI.
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { CHANGELOG, COMPARISONS, POSTS, getPost, postPath, validateContent } from './content-registry.ts'

const TODAY = new Date('2026-11-21T00:00:00Z') // TEMPLATE: replace with `new Date()`
const LOCALES = ['en', 'es']
const text = (title) => ({ title, description: `${title} description`, summary: `${title} summary` })
const messages = Object.fromEntries(LOCALES.map((l) => [l, {
  posts: Object.fromEntries(POSTS.map((p) => [p.key, text(p.key)])),
  comparisons: Object.fromEntries(COMPARISONS.map((c) => [c.key, text(c.key)])),
  changelog: Object.fromEntries(CHANGELOG.map((e) => [e.key, { ...text(e.key), items: ['Calendar shows two weeks'] }])),
}]))
const base = { posts: POSTS, comparisons: COMPARISONS, changelog: CHANGELOG, messages, locales: LOCALES, today: TODAY }

describe('content registry', () => {
  it('is valid', () => {
    assert.deepEqual(validateContent(base), [])
  })

  it('resolves a slug to its path', () => {
    const [first] = POSTS
    assert.equal(getPost(first.slug), first)
    assert.equal(getPost('nope'), undefined)
    assert.equal(postPath(first), `/blog/${first.slug}`)
  })
})

describe('validateContent', () => {
  it('fails stale third-party facts', () => {
    const problems = validateContent({ ...base, today: new Date('2027-06-01T00:00:00Z') })
    assert.ok(problems.some((p) => p.startsWith('comparison acme: facts last checked')))
  })

  it('fails a missing locale text and a duplicate slug', () => {
    const posts = [...POSTS, { ...POSTS[0], key: 'other' }]
    const problems = validateContent({ ...base, posts })
    assert.ok(problems.includes('posts: duplicate slug'))
    assert.ok(problems.some((p) => p.includes('missing title/description in en')))
  })

  it('fails a changelog out of order or with a forbidden word', () => {
    const changelog = [...CHANGELOG].reverse()
    const bad = structuredClone(messages)
    bad.es.changelog.v1_1.items = ['Arreglado un crash al guardar']
    bad.en.changelog.v1_1.items = ['Fixed a crash on save']
    const problems = validateContent({ ...base, changelog, messages: bad })
    assert.ok(problems.some((p) => p.includes('entries must be newest first')))
    assert.ok(problems.some((p) => p.includes('(en): forbidden word')))
  })

  it('fails a future publication date and a release outside its minor', () => {
    const posts = [{ ...POSTS[0], publishedAt: '2030-01-01' }]
    const changelog = [{ key: 'v1_1', minor: '1.1', releases: [{ version: '1.2.0', date: '2026-11-18' }] }]
    const problems = validateContent({ ...base, posts, changelog })
    assert.ok(problems.some((p) => p.includes('publishedAt is in the future')))
    assert.ok(problems.some((p) => p.includes('release 1.2.0 is not part of 1.1')))
  })
})
