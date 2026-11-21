import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import {
  DEFAULT_CONTEXT_THRESHOLD,
  extractPending,
  extractTranscriptState,
  renderHandoff,
  runStatusCommand,
  shouldWarn,
  statusLine,
} from './save-handoff.mjs'
import { makeRepo, put, runScript } from './_helpers.mjs'

const line = (o) => JSON.stringify(o)
const assistant = (text, usage, extra = {}) => line({ type: 'assistant', message: { content: [{ type: 'text', text }], usage }, ...extra })

describe('save-handoff: extractTranscriptState', () => {
  it('takes the last main-thread text and its context size', () => {
    const lines = [
      line({ type: 'user', message: { content: 'hi' } }),
      assistant('first', { input_tokens: 10, cache_read_input_tokens: 100, cache_creation_input_tokens: 5 }),
      assistant('from a subagent', { input_tokens: 999 }, { isSidechain: true }),
      line({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash' }], usage: { input_tokens: 1, cache_read_input_tokens: 200 } } }),
      'not json',
    ]
    assert.deepEqual(extractTranscriptState(lines), { lastText: 'first', contextTokens: 201 })
  })
  it('survives an empty or unknown transcript', () => {
    assert.deepEqual(extractTranscriptState([]), { lastText: null, contextTokens: null })
    assert.deepEqual(extractTranscriptState(['{"type":"unknown"}']), { lastText: null, contextTokens: null })
  })
})

describe('save-handoff: extractPending', () => {
  it('cuts from the pending heading', () => {
    const text = 'Done X.\n\n**Pending for you**\n- Merge the PR\n- Enable Pages'
    assert.equal(extractPending(text), '**Pending for you**\n- Merge the PR\n- Enable Pages')
  })
  it('falls back to the tail', () => {
    assert.equal(extractPending('short answer'), 'short answer')
    assert.equal(extractPending(null), '')
  })
})

describe('save-handoff: shouldWarn', () => {
  it('warns once past the threshold', () => {
    const t = DEFAULT_CONTEXT_THRESHOLD
    assert.equal(shouldWarn({ contextTokens: t, threshold: t, alreadyWarned: false }), true)
    assert.equal(shouldWarn({ contextTokens: t, threshold: t, alreadyWarned: true }), false)
    assert.equal(shouldWarn({ contextTokens: t - 1, threshold: t, alreadyWarned: false }), false)
    assert.equal(shouldWarn({ contextTokens: null, threshold: t, alreadyWarned: false }), false)
  })
})

describe('save-handoff: renderHandoff / statusLine', () => {
  it('renders the header load-handoff parses', () => {
    const md = renderHandoff({ branch: 'feat/x', sha: 'abc1234', status: '', diffstat: '', plan: null, pending: '', updated: '2030-01-01T10:00:00.000Z', event: 'Stop' })
    assert.ok(md.includes('branch: feat/x\nsha: abc1234\nupdated: 2030-01-01T10:00:00.000Z'))
    assert.ok(md.includes('(clean)'))
  })
  it('builds a one-line status from the first pending item', () => {
    assert.equal(statusLine({ branch: 'b', sha: 's', pending: '**Pending for you**\n- Merge the PR' }), 'b@s: Merge the PR')
    assert.equal(statusLine({ branch: 'b', sha: 's', pending: '' }), 'b@s')
  })
})

describe('save-handoff: optional status command', () => {
  it('is a no-op without a command and never throws on a failing one', () => {
    assert.equal(runStatusCommand(undefined, { status: 's', file: 'f', cwd: tmpdir() }), false)
    assert.equal(runStatusCommand('exit 3', { status: 's', file: 'f', cwd: tmpdir() }), false)
  })
  it('passes HANDOFF_STATUS and HANDOFF_FILE in the env', () => {
    const dir = mkdtempSync(join(tmpdir(), 'handoff-'))
    assert.equal(runStatusCommand('printf "%s|%s" "$HANDOFF_STATUS" "$HANDOFF_FILE" > out.txt', { status: 'b@s: x', file: '/f', cwd: dir }), true)
    assert.equal(readFileSync(join(dir, 'out.txt'), 'utf8'), 'b@s: x|/f')
  })
})

describe('save-handoff: CLI', () => {
  it('writes .context/handoff.md with the branch and runs the status command', () => {
    const repo = makeRepo({ 'a.js': 'a\n' }, 'main')
    put(repo, { 'b.js': 'b\n' })
    const r = runScript('save-handoff.mjs', {
      stdin: JSON.stringify({ hook_event_name: 'PreCompact' }),
      env: { CLAUDE_PROJECT_DIR: repo, HANDOFF_STATUS_CMD: 'echo "$HANDOFF_STATUS" > .context/status.txt' },
    })
    assert.equal(r.status, 0)
    const md = readFileSync(join(repo, '.context/handoff.md'), 'utf8')
    assert.match(md, /^branch: main$/m)
    assert.match(md, /event: PreCompact/)
    assert.match(md, /b\.js/)
    assert.ok(existsSync(join(repo, '.context/status.txt')))
  })
  it('malformed stdin exits 0', () => {
    assert.equal(runScript('save-handoff.mjs', { stdin: 'nope', env: { CLAUDE_PROJECT_DIR: makeRepo() } }).status, 0)
  })
})
