import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { checkTokens, missingCssVars } from './check-tokens.mjs'

const template = JSON.parse(readFileSync(new URL('./tokens.tokens.json', import.meta.url), 'utf8'))
const red = { colorSpace: 'srgb', components: [1, 0, 0] }

describe('check-tokens', () => {
  it('accepts the shipped template', () => {
    const { tokens, problems } = checkTokens(template)
    assert.deepEqual(problems, [])
    assert.ok(tokens.size > 10)
  })

  it('inherits the type from the group and from an alias', () => {
    const { problems } = checkTokens({ c: { $type: 'color', a: { $value: red } }, b: { $value: '{c.a}' } })
    assert.deepEqual(problems, [])
  })

  it('rejects a token with no type anywhere', () => {
    const { problems } = checkTokens({ a: { $value: 4 } })
    assert.match(problems[0], /no \$type/)
  })

  it('rejects bad names, unknown aliases and cycles', () => {
    const { problems } = checkTokens({
      $type: 'number',
      'a.b': { $value: 1 },
      x: { $value: '{nope}' },
      p: { $value: '{q}' },
      q: { $value: '{p}' },
    })
    assert.ok(problems.some((p) => p.includes('must not contain')))
    assert.ok(problems.some((p) => p.includes('unknown alias target "{nope}"')))
    assert.ok(problems.some((p) => p.includes('alias cycle')))
  })

  it('validates primitive values', () => {
    const { problems } = checkTokens({
      d: { $type: 'dimension', $value: '16px' },
      w: { $type: 'fontWeight', $value: 'Bold' },
      c: { $type: 'color', $value: '#ff0000' },
      t: { $type: 'duration', $value: { value: 1, unit: 'min' } },
      e: { $type: 'cubicBezier', $value: [2, 0, 0.2, 1] },
    })
    assert.equal(problems.length, 5)
  })

  it('checks composite parts and the type of aliased parts', () => {
    const { problems } = checkTokens({
      n: { $type: 'number', $value: 2 },
      typo: { $type: 'typography', $value: { fontFamily: 'X', fontSize: '{n}', fontWeight: 400, lineHeight: 1 } },
    })
    assert.ok(problems.some((p) => p.includes('fontSize: alias {n} is number, expected dimension')))
    assert.ok(problems.some((p) => p.includes('missing "letterSpacing"')))
  })

  it('reports tokens missing from the generated CSS', () => {
    const { tokens } = checkTokens({ color: { $type: 'color', brand: { $value: red }, ink: { $value: red } } })
    assert.deepEqual(missingCssVars(tokens, ':root { --color-brand: #f00; }'), ['--color-ink'])
  })
})
