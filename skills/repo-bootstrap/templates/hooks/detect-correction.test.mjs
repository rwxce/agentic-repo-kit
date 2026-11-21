import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, it } from 'node:test'
import { detectCorrection, reflectContext, record, PATTERNS, ENABLED_LANGUAGES } from './detect-correction.mjs'
import { runScript } from './_helpers.mjs'

describe('detect-correction', () => {
  const hits = [
    'I already told you to use tabs',
    "that's not what I asked",
    'you keep adding comments',
    'you did it again',
    'I asked you not to touch that',
  ]
  const misses = [
    "don't use emojis",
    'ya te dije que no lo hicieras', // Spanish is opt-in, off by default
    'please add a test',
    'what did I tell you last week about X?'.replace('tell you', 'say'),
    '<task-notification>I told you so</task-notification>',
    '',
  ]
  for (const p of hits) it(`detects: ${p}`, () => assert.ok(detectCorrection(p)))
  for (const p of misses) it(`ignores: ${JSON.stringify(p)}`, () => assert.equal(detectCorrection(p), null))

  it('English only by default; Spanish works when its patterns are passed', () => {
    assert.deepEqual(ENABLED_LANGUAGES, ['en'])
    assert.ok(detectCorrection('ya te dije que no lo hicieras', PATTERNS.es))
    assert.ok(detectCorrection('lo has vuelto a romper', PATTERNS.es))
    assert.equal(detectCorrection('please add a test', PATTERNS.es), null)
  })

  it('ignores non-strings', () => assert.equal(detectCorrection(null), null))

  it('context mentions skill and log path', () => {
    assert.match(reflectContext(), /`reflect`/)
    assert.match(reflectContext(), /corrections\.jsonl/)
  })

  it('record appends JSON lines and truncates the prompt', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'corr-'))
    record('x'.repeat(1000), 'cue', dir)
    record('second', 'cue2', dir)
    const lines = fs.readFileSync(path.join(dir, '.context/reflect/corrections.jsonl'), 'utf8').trim().split('\n')
    assert.equal(lines.length, 2)
    assert.equal(JSON.parse(lines[0]).prompt.length, 400)
    assert.equal(JSON.parse(lines[1]).cue, 'cue2')
  })

  it('record never throws on an unwritable location', () => {
    assert.equal(record('x', 'c', '/dev/null/nope'), null)
  })

  it('runHook logs under CLAUDE_PROJECT_DIR and emits context; silent otherwise', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'corr-'))
    const r = runScript('detect-correction.mjs', {
      stdin: JSON.stringify({ prompt: 'I told you not to do that' }),
      env: { CLAUDE_PROJECT_DIR: dir },
    })
    assert.equal(r.status, 0)
    assert.match(JSON.parse(r.stdout).hookSpecificOutput.additionalContext, /reflect/)
    assert.ok(fs.existsSync(path.join(dir, '.context/reflect/corrections.jsonl')))
    const q = runScript('detect-correction.mjs', { stdin: JSON.stringify({ prompt: 'hello' }), env: { CLAUDE_PROJECT_DIR: dir } })
    assert.equal(q.stdout, '')
  })

  it('malformed stdin exits 0', () => {
    assert.equal(runScript('detect-correction.mjs', { stdin: 'nope' }).status, 0)
  })
})
