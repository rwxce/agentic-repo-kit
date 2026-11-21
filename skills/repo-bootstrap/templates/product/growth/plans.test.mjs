// Runs with `node --test` (Node >= 22.18 strips the types) or Vitest/Jest.
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { FEATURES, LIMITS, LIMIT_TABLE, TIERS, checkLimit, hasFeature, lowestTierWith } from './plans.ts'

const rank = (v) => (v === null ? Infinity : v)

describe('plans', () => {
  it('never gives a higher tier a lower limit or fewer features', () => {
    for (let i = 1; i < TIERS.length; i++) {
      const [lo, hi] = [TIERS[i - 1], TIERS[i]]
      for (const key of Object.keys(LIMITS[lo])) {
        assert.ok(rank(LIMITS[hi][key]) >= rank(LIMITS[lo][key]), `${hi}.${key} < ${lo}.${key}`)
      }
      for (const f of FEATURES[lo]) assert.ok(hasFeature(hi, f), `${hi} lacks ${f} that ${lo} has`)
    }
  })

  it('says where every limit and feature is enforced', () => {
    const keys = new Set([...Object.keys(LIMITS[TIERS[0]]), ...TIERS.flatMap((t) => FEATURES[t])])
    for (const k of keys) {
      assert.ok(LIMIT_TABLE[k], `${k} missing from LIMIT_TABLE`)
      assert.ok(LIMIT_TABLE[k].enforcedIn.length > 0, `${k} is enforced nowhere`)
    }
  })

  it('checks a limit on the server and returns the typed error at the boundary', () => {
    assert.deepEqual(checkLimit('free', 'generationsPerMonth', 6), { ok: true, remaining: 1 })
    assert.deepEqual(checkLimit('free', 'generationsPerMonth', 7), { ok: false, code: 'QUOTA_EXHAUSTED', limit: 7 })
    assert.deepEqual(checkLimit('pro', 'seats', 999), { ok: true, remaining: null })
  })

  it('finds the cheapest tier for an upgrade prompt', () => {
    assert.equal(lowestTierWith('autoPublish'), 'starter')
  })
})
