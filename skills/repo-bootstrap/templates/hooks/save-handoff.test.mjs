import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import {
  activePlan,
  DEFAULT_CONTEXT_THRESHOLD,
  extractPending,
  extractTranscriptState,
  handoffInputFromOpencodeMessages,
  renderHandoff,
  runStatusCommand,
  shouldWarn,
  stateFromInput,
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
  it('takes the last heading-shaped line, not a sentence that starts with the words', () => {
    const text = '## Next steps\n- old\n\nNext steps are unclear in prose.\n\n**Pending for you**\n- Merge'
    assert.equal(extractPending(text), '**Pending for you**\n- Merge')
  })
  it('falls back to the tail', () => {
    assert.equal(extractPending('short answer'), 'short answer')
    assert.equal(extractPending(null), '')
  })
})

describe('save-handoff: handoffInputFromOpencodeMessages', () => {
  const msg = (role, parts, tokens) => ({ info: { role, ...(tokens ? { tokens } : {}) }, parts })
  it('takes the last non-synthetic assistant text and its context size', () => {
    const input = handoffInputFromOpencodeMessages(
      [
        msg('assistant', [{ type: 'text', text: 'old' }]),
        msg('user', [{ type: 'text', text: 'go on' }]),
        msg('assistant', [{ type: 'text', text: 'Pending: x' }, { type: 'text', text: 'ignored', synthetic: true }], { input: 10, cache: { read: 5, write: 1 } }),
      ],
      { sessionID: 's1', event: 'Stop' },
    )
    assert.deepEqual(input, { hook_event_name: 'Stop', session_id: 's1', last_assistant_text: 'Pending: x', context_tokens: 16 })
  })
  it('skips assistant messages with only tool parts and tolerates garbage', () => {
    const input = handoffInputFromOpencodeMessages([msg('assistant', [{ type: 'text', text: 'real' }]), msg('assistant', [{ type: 'tool' }])], { sessionID: 's', event: 'PreCompact' })
    assert.equal(input.last_assistant_text, 'real')
    assert.deepEqual(handoffInputFromOpencodeMessages(null, { sessionID: 's', event: 'Stop' }), { hook_event_name: 'Stop', session_id: 's' })
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
      cwd: repo,
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
    assert.equal(runScript('save-handoff.mjs', { stdin: 'nope', cwd: makeRepo(), env: { CLAUDE_PROJECT_DIR: makeRepo() } }).status, 0)
  })
})

describe('save-handoff: stateFromInput', () => {
  it('reads the text and context size a host hands over directly', () => {
    assert.deepEqual(stateFromInput({ last_assistant_text: 'hi', context_tokens: 42 }), { lastText: 'hi', contextTokens: 42 })
    assert.deepEqual(stateFromInput({ last_assistant_text: '  ', context_tokens: 'x' }), { lastText: null, contextTokens: null })
    assert.deepEqual(stateFromInput(undefined), { lastText: null, contextTokens: null })
  })
})

describe('save-handoff: activePlan', () => {
  const touch = (path, ageMs, now) => {
    mkdirSync(join(path, '..'), { recursive: true })
    writeFileSync(path, 'x')
    const t = (now - ageMs) / 1000
    utimesSync(path, t, t)
  }
  it('picks the most recent initiative and prefers its plan.md', () => {
    const now = Date.now()
    const dir = mkdtempSync(join(tmpdir(), 'plans-'))
    touch(join(dir, 'old', 'plan.md'), 3_600_000, now)
    touch(join(dir, 'new', 'plan.md'), 7_200_000, now)
    touch(join(dir, 'new', 'decisions.md'), 1_000, now)
    assert.equal(activePlan(dir, now), join(dir, 'new', 'plan.md'))
  })
  it('ignores plans older than a day and a missing dir', () => {
    const now = Date.now()
    const dir = mkdtempSync(join(tmpdir(), 'plans-'))
    touch(join(dir, 'stale.md'), 2 * 86_400_000, now)
    assert.equal(activePlan(dir, now), null)
    assert.equal(activePlan(join(dir, 'nope'), now), null)
  })
})
