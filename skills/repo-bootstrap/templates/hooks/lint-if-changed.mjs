#!/usr/bin/env node
/**
 * Stop — advisory (always exits 0).
 *
 * Runs your lint command only when the working tree has changed source files (tracked diff vs
 * HEAD + untracked), so doc-only / chat-only turns don't pay the lint cost. The output is
 * tailed so the transcript stays readable.
 *
 * With `command: null` the command is auto-detected: a `lint` script in package.json run through
 * the package manager implied by the lockfile. Set `command` explicitly for non-JS repos, e.g.
 * ['ruff', 'check', '.'] together with `sourceExt: /\.py$/`.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

// ---------------------------------------------------------------------------------------------
// CONFIG — edit for your repo
// ---------------------------------------------------------------------------------------------
export const CONFIG = {
  /** argv array, e.g. ['pnpm', 'run', 'lint']. null = auto-detect from package.json + lockfile. */
  command: null,
  /** Files that count as "source changed". */
  sourceExt: /\.(ts|tsx|js|jsx|mjs|cjs|vue|svelte)$/,
  /** Lines of output to keep. */
  tailLines: 30,
  /** Kill the lint run after this long (keep below the hook timeout). */
  timeoutMs: 50_000,
}
// ---------------------------------------------------------------------------------------------

export function hasSourceChanges(files, sourceExt = CONFIG.sourceExt) {
  return files.some((f) => sourceExt.test(f.trim()))
}

/** Picks the lint argv for a JS repo from the lockfile + package.json; null when there is none. */
export function detectLintCommand(dir = process.cwd()) {
  let pkg
  try {
    pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  } catch {
    return null
  }
  if (!pkg?.scripts?.lint) return null
  if (existsSync(join(dir, 'pnpm-lock.yaml'))) return ['pnpm', 'run', 'lint']
  if (existsSync(join(dir, 'yarn.lock'))) return ['yarn', 'run', 'lint']
  if (existsSync(join(dir, 'bun.lockb')) || existsSync(join(dir, 'bun.lock'))) return ['bun', 'run', 'lint']
  return ['npm', 'run', 'lint']
}

export function tail(out, lines = CONFIG.tailLines) {
  return out.trim().split('\n').slice(-lines).join('\n')
}

function git(args, cwd) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  } catch {
    return ''
  }
}

/** Returns the lint output tail ('' when nothing ran or lint was clean and silent). */
export function run(cwd = process.cwd(), config = CONFIG) {
  const files = `${git(['diff', '--name-only', 'HEAD'], cwd)}\n${git(['ls-files', '--others', '--exclude-standard'], cwd)}`
    .split('\n')
    .filter(Boolean)
  if (!hasSourceChanges(files, config.sourceExt)) return ''
  const cmd = config.command ?? detectLintCommand(cwd)
  if (!cmd) return ''
  let out = ''
  try {
    out = execFileSync(cmd[0], cmd.slice(1), {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 32 * 1024 * 1024,
      timeout: config.timeoutMs,
    })
  } catch (err) {
    out = `${err.stdout ?? ''}${err.stderr ?? ''}` || String(err.message ?? '')
  }
  return tail(out, config.tailLines)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = run(process.env.CLAUDE_PROJECT_DIR || process.cwd())
  if (out) console.log(out)
  process.exit(0)
}
