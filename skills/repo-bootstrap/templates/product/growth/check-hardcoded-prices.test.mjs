import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { findPrices } from './check-hardcoded-prices.mjs'

describe('check-hardcoded-prices', () => {
  it('finds literal prices in components and messages', () => {
    for (const s of ['<span>$19/mo</span>', '"price": "19 €"', 'Only €9.99', 'USD 20 per seat', '"from": "12,50 €"']) {
      assert.equal(findPrices(s).length, 1, s)
    }
  })

  it('ignores computed prices, ICU placeholders and plain numbers', () => {
    for (const s of ['{formatPrice(plan.amount)}', '"price": "{price}/mo"', '`${amount} €`.trim()', 'width: 19px', 'v1.2', '$t("x")']) {
      assert.deepEqual(findPrices(s), [], s)
    }
  })

  it('reports the line number', () => {
    assert.deepEqual(findPrices('a\nb $5\n'), [{ line: 2, text: 'b $5' }])
  })
})
