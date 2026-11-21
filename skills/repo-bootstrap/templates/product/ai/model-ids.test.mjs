// Runs with `node --test` (Node >= 22.18 strips the types) or Vitest/Jest.
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { MODEL_ENV_VARS, ModelConfigError, getModelId, missingModelEnvVars } from './model-ids.ts'

describe('model ids', () => {
  it('reads the model from the feature var at call time', () => {
    assert.equal(getModelId('summarize', { AI_SUMMARIZE_MODEL: ' openai/some-model ' }), 'openai/some-model')
  })

  it('has no default: a missing var throws a typed error', () => {
    assert.throws(() => getModelId('summarize', {}), (e) =>
      e instanceof ModelConfigError && e.code === 'AI_MODEL_NOT_CONFIGURED' && e.envVar === 'AI_SUMMARIZE_MODEL')
  })

  it('rejects a provider that was not approved, and ids without a provider', () => {
    for (const value of ['someprovider/x', 'bare-model']) {
      assert.throws(() => getModelId('classify', { AI_CLASSIFY_MODEL: value }), (e) => e.code === 'AI_MODEL_PROVIDER_NOT_ALLOWED')
    }
  })

  it('reports required vars that are unset, and only those', () => {
    assert.deepEqual(missingModelEnvVars({ AI_SUMMARIZE_MODEL: 'openai/x' }), ['AI_CLASSIFY_MODEL'])
  })

  it('uses one distinct var per feature', () => {
    const vars = Object.values(MODEL_ENV_VARS)
    assert.equal(new Set(vars).size, vars.length)
  })
})
