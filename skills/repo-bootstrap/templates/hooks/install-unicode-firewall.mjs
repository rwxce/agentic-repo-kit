#!/usr/bin/env node
/**
 * WHAT: Installs the Unicode firewall machine-wide for Claude Code: copies unicode-firewall.mjs (next
 * to this file) to <config>/hooks/ and registers it on UserPromptSubmit, PostToolUse and
 * PostToolUseFailure in <config>/settings.json, keeping every hook already there. <config> is
 * $CLAUDE_CONFIG_DIR when set, else ~/.claude. Re-running only refreshes the copy and adds any missing event (idempotent).
 *
 * REPO SIGNAL: same as unicode-firewall.mjs. CONFIGURE: nothing; wire as a package script.
 *
 *   node scripts/install-unicode-firewall.mjs            dry run: prints the settings.json diff, writes nothing
 *   node scripts/install-unicode-firewall.mjs --write    copies the hook and saves settings.json (backup alongside)
 */

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const MARKER = 'unicode-firewall.mjs'

/** Claude Code's user config directory: CLAUDE_CONFIG_DIR relocates ~/.claude. */
export function configRoot(env = process.env) {
  return env.CLAUDE_CONFIG_DIR ? path.resolve(env.CLAUDE_CONFIG_DIR) : path.join(os.homedir(), '.claude')
}

/**
 * settings with the firewall registered exactly once on each event, pointing at hookPath with the
 * expected matcher. Any other firewall registration (stale path after a CLAUDE_CONFIG_DIR move, a
 * different matcher, duplicates) is removed; other hooks, even in the same group, stay untouched.
 */
export function withFirewall(settings, hookPath) {
  const next = structuredClone(settings ?? {})
  next.hooks ??= {}
  const command = `node "${hookPath}"`
  const entry = (matcher) => ({ ...(matcher ? { matcher } : {}), hooks: [{ type: 'command', command, timeout: 10 }] })
  const isFirewall = (h) => String(h?.command ?? '').includes(MARKER)
  for (const [event, matcher] of [['UserPromptSubmit', null], ['PostToolUse', '*'], ['PostToolUseFailure', '*']]) {
    let kept = false
    const groups = []
    for (const group of next.hooks[event] ?? []) {
      const exactGroup = (group.matcher ?? null) === matcher
      const hooks = (group.hooks ?? []).filter((h) => {
        if (!isFirewall(h)) return true
        if (!kept && exactGroup && h.command === command) return (kept = true)
        return false
      })
      if (hooks.length) groups.push(hooks.length === (group.hooks ?? []).length ? group : { ...group, hooks })
    }
    if (!kept) groups.push(entry(matcher))
    next.hooks[event] = groups
  }
  return next
}

function main() {
  const write = process.argv.includes('--write')
  const home = configRoot()
  const hookPath = path.join(home, 'hooks', MARKER)
  const settingsPath = path.join(home, 'settings.json')
  const current = fs.existsSync(settingsPath) ? JSON.parse(fs.readFileSync(settingsPath, 'utf8')) : {}
  const before = `${JSON.stringify(current, null, 2)}\n`
  const after = `${JSON.stringify(withFirewall(current, hookPath), null, 2)}\n`

  if (before === after) console.log('settings.json already registers the firewall.')
  else {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fw-'))
    fs.writeFileSync(path.join(tmp, 'before.json'), before)
    fs.writeFileSync(path.join(tmp, 'after.json'), after)
    try {
      execFileSync('diff', ['-u', '--label', 'settings.json (now)', '--label', 'settings.json (with firewall)', path.join(tmp, 'before.json'), path.join(tmp, 'after.json')], { stdio: 'inherit' })
    } catch {
      // diff exits 1 when the files differ; the diff is already printed.
    }
    fs.rmSync(tmp, { recursive: true, force: true })
  }

  if (!write) {
    console.log(`\nDry run. Re-run with --write to copy the hook to ${hookPath} and save settings.json.`)
    return
  }
  fs.mkdirSync(path.dirname(hookPath), { recursive: true })
  fs.copyFileSync(fileURLToPath(new URL('./unicode-firewall.mjs', import.meta.url)), hookPath)
  if (before !== after) {
    if (fs.existsSync(settingsPath)) fs.copyFileSync(settingsPath, `${settingsPath}.bak-firewall`)
    fs.writeFileSync(settingsPath, after)
  }
  console.log(`Installed ${hookPath}${before !== after ? ` and updated ${settingsPath} (backup: settings.json.bak-firewall)` : ''}.`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
