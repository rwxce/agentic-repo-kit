import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { checkGlossary, flatten, hasWord } from './check-glossary.mjs'

const glossary = JSON.parse(readFileSync(new URL('./glossary.json', import.meta.url), 'utf8'))

describe('check-glossary', () => {
  it('matches whole words, Unicode-aware', () => {
    assert.ok(hasWord('Tus publicaciones', 'publicaciones'))
    assert.ok(!hasWord('repost later', 'post'))
    assert.ok(hasWord('Your Post is ready', 'post'))
    assert.ok(!hasWord('publicacións', 'publicación'))
  })

  it('flattens nested messages and arrays', () => {
    assert.deepEqual(flatten({ a: { b: 'x', c: ['y'] } }), { 'a.b': 'x', 'a.c.0': 'y' })
  })

  it('passes when every locale uses an approved form', () => {
    const messages = {
      en: flatten({ home: { title: 'Your posts in Acme Pilot', ws: 'New workspace' } }),
      es: flatten({ home: { title: 'Tus publicaciones en Acme Pilot', ws: 'Nuevo espacio de trabajo' } }),
    }
    assert.deepEqual(checkGlossary(glossary, messages), [])
  })

  it('flags a wrong translation, a translated brand term and an avoided word', () => {
    const messages = {
      en: flatten({ home: { title: 'Your posts in Acme Pilot' } }),
      es: flatten({ home: { title: 'Tus entradas en Piloto Acme' } }),
    }
    const problems = checkGlossary(glossary, messages)
    assert.equal(problems.length, 3)
    assert.ok(problems.includes('es home.title: "Acme Pilot" should be "Acme Pilot"'))
    assert.ok(problems.includes('es home.title: "post" should be "publicación" / "publicaciones"'))
    assert.ok(problems.some((p) => p.startsWith('es home.title: avoid "entradas"')))
  })

  it('leaves missing keys to i18n parity', () => {
    const messages = { en: flatten({ a: 'one post' }), es: {} }
    assert.deepEqual(checkGlossary(glossary, messages), [])
  })
})
