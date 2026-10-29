import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { detectFeatureIntent, featureContext, CONFIG } from './detect-feature-intent.mjs'
import { runScript } from './_helpers.mjs'

describe('detect-feature-intent', () => {
  const hits = [
    'I want to add a new feature for exporting reports',
    'I want users to be able to invite teammates',
    'We need a new feature for billing',
    'we need to build a flow for onboarding',
    'Build a feature that lists orders',
    'vull afegir una nova funcionalitat de notificacions',
    'vull que els usuaris puguin exportar',
    'quiero añadir una nueva funcionalidad de pagos',
    'quiero que los usuarios puedan invitar',
    'nueva funcionalidad: exportar a CSV',
  ]
  const misses = [
    'fix the login bug',
    'arregla el botó de login',
    'why does this feature flag exist?',
    'rename the variable',
    'what does this function do',
    'ajusta el copy del hero',
    '<task-notification>I want to add a new feature</task-notification>',
    '[SYSTEM NOTIFICATION] new feature',
    '',
  ]
  for (const p of hits) it(`detects: ${p}`, () => assert.ok(detectFeatureIntent(p)))
  for (const p of misses) it(`ignores: ${JSON.stringify(p)}`, () => assert.equal(detectFeatureIntent(p), null))

  it('ignores non-strings', () => assert.equal(detectFeatureIntent(undefined), null))

  it('context names the configured skill', () => {
    assert.match(featureContext(), /`plan-feature`/)
    assert.match(featureContext({ ...CONFIG, skill: 'my-skill' }), /`my-skill`/)
  })

  it('emits additionalContext on a hit and nothing on a miss', () => {
    const hit = runScript('detect-feature-intent.mjs', { stdin: JSON.stringify({ prompt: 'I want to build a new feature' }) })
    const out = JSON.parse(hit.stdout)
    assert.equal(out.hookSpecificOutput.hookEventName, 'UserPromptSubmit')
    assert.match(out.hookSpecificOutput.additionalContext, /plan-feature/)
    const miss = runScript('detect-feature-intent.mjs', { stdin: JSON.stringify({ prompt: 'fix typo' }) })
    assert.equal(miss.status, 0)
    assert.equal(miss.stdout, '')
  })

  it('malformed stdin exits 0', () => {
    assert.equal(runScript('detect-feature-intent.mjs', { stdin: '<<<' }).status, 0)
  })
})
