#!/usr/bin/env node
/**
 * Stop — advisory, always exits 0.
 *
 * Keeps a local code index (knowledge graph, ctags, SCIP dump...) from going stale without paying
 * its update cost on every turn: it runs the update command only when a changed source file is
 * newer than the index output, or a tracked source file was deleted. Nobody should be blocked
 * from finishing a turn because an optional index could not refresh.
 *
 * Silent when nothing needs doing, so the output stays worth reading. Run it from the repo root
 * (the wiring `cd`s there first).
 */
import { execFileSync } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

// ---------------------------------------------------------------------------------------------
// CONFIG — edit for your repo
// ---------------------------------------------------------------------------------------------
export const CONFIG = {
  /** Directory the index writes to (ignored when listing changed files). */
  indexDir: '.code-index',
  /** File whose mtime marks the last successful update, relative to the repo root. */
  indexFile: '.code-index/graph.json',
  /** argv of the update command; the first element is probed with `--help` to see if it exists. */
  updateCommand: ['<code-index-cli>', 'update', '.'],
  /** Only changes to these extensions are worth an update (what the index actually covers). */
  sourceExt: /\.(ts|tsx|js|jsx|mjs|cjs|mts|cts|json|py|go|rs|rb|java|kt)$/,
  /** Shown when the CLI is missing. */
  installHint: 'install it (see your index tool docs) to keep the index in sync',
  /** Shown when the index has never been built. */
  buildHint: 'run the update command once to build it',
  timeoutMs: 110_000,
}
// ---------------------------------------------------------------------------------------------

function run(cmd, args, opts = {}) {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 32 * 1024 * 1024, ...opts })
  } catch {
    return null
  }
}

/** Changed + untracked source files (repo-relative) the index covers. */
export function relevantFiles(files, config = CONFIG) {
  const prefix = `${config.indexDir.replace(/\/$/, '')}/`
  return files.map((f) => f.trim()).filter((f) => f && config.sourceExt.test(f) && !f.startsWith(prefix))
}

/**
 * Should the index be updated?
 * @param {{ candidates: string[], indexMtime: number, mtimeOf: (f: string) => number | null, deleted: string[] }} s
 */
export function needsUpdate({ candidates, indexMtime, mtimeOf, deleted }, config = CONFIG) {
  if (candidates.length === 0) return false
  if (candidates.some((f) => (mtimeOf(f) ?? 0) > indexMtime)) return true
  return deleted.some((f) => config.sourceExt.test(f.trim()))
}

/** Lines to print for `cwd` (possibly none). Runs the update when needed. */
export function refresh(cwd = process.cwd(), config = CONFIG) {
  const [cli, ...cliArgs] = config.updateCommand
  if (run(cli, ['--help'], { cwd }) === null) return [`[index] ${cli} not installed — ${config.installHint}.`]
  const indexFile = join(cwd, config.indexFile)
  if (!existsSync(indexFile)) return [`[index] no index yet (${config.indexFile}) — ${config.buildHint}.`]

  const tracked = run('git', ['diff', '--name-only', 'HEAD'], { cwd }) ?? ''
  const untracked = run('git', ['ls-files', '--others', '--exclude-standard'], { cwd }) ?? ''
  const candidates = relevantFiles(`${tracked}\n${untracked}`.split('\n'), config)
  const deleted = (run('git', ['diff', '--name-only', '--diff-filter=D', 'HEAD'], { cwd }) ?? '').split('\n')
  const mtimeOf = (f) => {
    try {
      return statSync(join(cwd, f)).mtimeMs
    } catch {
      return null
    }
  }
  if (!needsUpdate({ candidates, indexMtime: statSync(indexFile).mtimeMs, mtimeOf, deleted }, config)) return []

  const lines = [`[index] ${candidates.length} changed source file(s) — updating the index...`]
  const out = run(cli, cliArgs, { cwd, timeout: config.timeoutMs })
  if (out === null) lines.push('[index] update failed or timed out — index left as-is, will retry next turn.')
  else lines.push(...out.trim().split('\n').slice(-2).filter(Boolean))
  return lines
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const lines = refresh(process.cwd())
    if (lines.length) console.log(lines.join('\n'))
  } catch {}
  process.exit(0)
}
