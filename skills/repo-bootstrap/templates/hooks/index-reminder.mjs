#!/usr/bin/env node
/**
 * PreToolUse (matcher Grep|Glob) — non-blocking nudge toward your code index.
 *
 * The first time per session a Grep/Glob runs and the index exists, inject a one-line reminder
 * to prefer the index for broad / multi-module questions. Per-session state is a marker file in
 * the OS temp dir keyed by the hook's `session_id` (falling back to the parent PID). It never
 * blocks and exits 0 in every case; silent when there is no index or the reminder was already
 * shown.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// ---------------------------------------------------------------------------------------------
// CONFIG — edit for your repo
// ---------------------------------------------------------------------------------------------
export const CONFIG = {
  /** The reminder only fires when this file exists (relative to the project dir). */
  indexPath: 'graphify-out/graph.json',
  reminder: 'A code index exists — prefer `graphify query "…"` for broad/multi-module questions before grep.',
  /** Temp marker file prefix; make it unique per project. */
  markerPrefix: 'agent-index-reminder-',
}
// ---------------------------------------------------------------------------------------------

export function markerPath(sessionKey, tmpDir = os.tmpdir(), prefix = CONFIG.markerPrefix) {
  const safe = String(sessionKey).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80)
  return path.join(tmpDir, `${prefix}${safe}`)
}

/** True (and records the marker) only the first time for this session key. */
export function claimReminder(sessionKey, tmpDir = os.tmpdir(), prefix = CONFIG.markerPrefix) {
  try {
    fs.writeFileSync(markerPath(sessionKey, tmpDir, prefix), '', { flag: 'wx' })
    return true
  } catch {
    return false
  }
}

/** Hook output for the first Grep/Glob of a session, or null. */
export function decide(input, { projectDir, tmpDir = os.tmpdir(), config = CONFIG, ppid = process.ppid } = {}) {
  if (!fs.existsSync(path.join(projectDir, config.indexPath))) return null
  const key = input?.session_id ?? input?.sessionId ?? `ppid-${ppid}`
  if (!claimReminder(key, tmpDir, config.markerPrefix)) return null
  return { hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: config.reminder } }
}

export function runHook() {
  let input = {}
  try {
    input = JSON.parse(fs.readFileSync(0, 'utf8'))
  } catch {}
  try {
    const out = decide(input, { projectDir: process.env.CLAUDE_PROJECT_DIR || process.cwd() })
    if (out) process.stdout.write(JSON.stringify(out))
  } catch {}
  process.exit(0)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runHook()
