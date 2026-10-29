import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, it } from 'node:test'
import { markerPath, claimReminder, decide, CONFIG } from './index-reminder.mjs'
import { runScript } from './_helpers.mjs'

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'idx-'))
const projectWithIndex = () => {
  const dir = tmp()
  fs.mkdirSync(path.join(dir, 'graphify-out'))
  fs.writeFileSync(path.join(dir, CONFIG.indexPath), '{}')
  return dir
}

describe('index-reminder', () => {
  it('sanitises the session key in the marker name', () => {
    const p = markerPath('../../etc/passwd', '/tmp')
    assert.equal(path.dirname(p), '/tmp')
    assert.doesNotMatch(path.basename(p), /[/.]/)
  })

  it('claims only once per session key', () => {
    const t = tmp()
    assert.equal(claimReminder('s1', t), true)
    assert.equal(claimReminder('s1', t), false)
    assert.equal(claimReminder('s2', t), true)
  })

  it('stays silent without an index', () => {
    assert.equal(decide({ session_id: 'a' }, { projectDir: tmp(), tmpDir: tmp() }), null)
  })

  it('reminds once per session when the index exists', () => {
    const projectDir = projectWithIndex()
    const tmpDir = tmp()
    const first = decide({ session_id: 'a' }, { projectDir, tmpDir })
    assert.equal(first.hookSpecificOutput.hookEventName, 'PreToolUse')
    assert.match(first.hookSpecificOutput.additionalContext, /index/)
    assert.equal(decide({ session_id: 'a' }, { projectDir, tmpDir }), null)
    assert.ok(decide({ session_id: 'b' }, { projectDir, tmpDir }))
  })

  it('falls back to the parent pid when there is no session id', () => {
    const projectDir = projectWithIndex()
    const tmpDir = tmp()
    assert.ok(decide({}, { projectDir, tmpDir, ppid: 4242 }))
    assert.equal(decide({}, { projectDir, tmpDir, ppid: 4242 }), null)
  })

  it('CLI: always exits 0, even with malformed stdin or no index', () => {
    const projectDir = tmp()
    const env = { CLAUDE_PROJECT_DIR: projectDir }
    assert.equal(runScript('index-reminder.mjs', { stdin: 'garbage', env }).status, 0)
    assert.equal(runScript('index-reminder.mjs', { stdin: '', env }).stdout, '')
  })

  it('CLI: emits the reminder on the first call with an index, then nothing', () => {
    const projectDir = projectWithIndex()
    const env = { CLAUDE_PROJECT_DIR: projectDir }
    const sid = `test-${process.pid}-${Date.now()}`
    const stdin = JSON.stringify({ session_id: sid, tool_name: 'Grep' })
    try {
      const a = runScript('index-reminder.mjs', { stdin, env })
      assert.match(JSON.parse(a.stdout).hookSpecificOutput.additionalContext, /index/)
      assert.equal(runScript('index-reminder.mjs', { stdin, env }).stdout, '')
    } finally {
      fs.rmSync(markerPath(sid), { force: true })
    }
  })
})
