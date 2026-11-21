import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { dropNulls, toStrictSchema } from './strict-json-schema.mjs'

const input = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    title: { type: 'string', minLength: 1 },
    tags: { type: 'array', items: { type: 'string', format: 'slug' } },
    kind: { oneOf: [{ type: 'string', enum: ['a'] }, { type: 'object', properties: { x: { type: 'number' } }, required: ['x'] }] },
    note: { type: 'string', default: '' },
  },
  required: ['title', 'kind'],
}

describe('toStrictSchema', () => {
  const out = toStrictSchema(input)

  it('requires every key and makes optional ones nullable', () => {
    assert.deepEqual(out.required, ['title', 'tags', 'kind', 'note'])
    assert.deepEqual(out.properties.tags.type, ['array', 'null'])
    assert.deepEqual(out.properties.note.type, ['string', 'null'])
    assert.equal(out.properties.title.type, 'string')
  })

  it('closes every object and converts oneOf to anyOf', () => {
    assert.equal(out.additionalProperties, false)
    assert.ok(out.properties.kind.anyOf)
    assert.equal(out.properties.kind.anyOf[1].additionalProperties, false)
    assert.deepEqual(out.properties.kind.anyOf[1].required, ['x'])
  })

  it('drops unsupported keywords and unknown formats, keeping a note', () => {
    assert.equal(out.$schema, undefined)
    assert.equal(out.properties.note.default, undefined)
    assert.match(out.properties.note.description, /default/)
    assert.equal(out.properties.tags.items.format, undefined)
    assert.match(out.properties.tags.items.description, /format: slug/)
  })

  it('keeps supported constraints unless configured to drop them', () => {
    assert.equal(out.properties.title.minLength, 1)
    assert.equal(toStrictSchema(input, { drop: ['minLength'] }).properties.title.minLength, undefined)
  })

  it('does not mutate its input', () => {
    assert.equal(input.properties.note.default, '')
    assert.deepEqual(input.required, ['title', 'kind'])
  })
})

describe('dropNulls', () => {
  it('maps nulls back to absent keys, deeply', () => {
    assert.deepEqual(dropNulls({ a: 1, b: null, c: [{ d: null, e: 2 }] }), { a: 1, c: [{ e: 2 }] })
  })
})
