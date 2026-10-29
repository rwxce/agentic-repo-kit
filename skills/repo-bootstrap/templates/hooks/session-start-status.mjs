#!/usr/bin/env node
/**
 * SessionStart — advisory context.
 *
 * Two optional one-liners, injected as `additionalContext`:
 *   1. Fresh-branch nudge: a task branch with no commits ahead of the base and a clean tree
 *      means "nothing has been written yet" — remind the agent to plan before coding. Whether
 *      the request is really a feature stays the agent's call. Uses the LOCAL base ref (no
 *      network).
 *   2. Code-index status: ready / building / missing (+ how to fix), for any index you keep
 *      (a knowledge graph, ctags, a SCIP/LSIF dump, ...). Set `index: null` to disable.
 *
 * Prints nothing and exits 0 in every other case; every probe is wrapped so a failure never
 * blocks a session.
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

// ---------------------------------------------------------------------------------------------
// CONFIG — edit for your repo
// ---------------------------------------------------------------------------------------------
export const CONFIG = {
  /** First of these that exists locally is the base for "commits ahead". */
  baseRefs: ['origin/dev', 'origin/develop', 'origin/main', 'origin/master'],
  /** Long-lived branches never get the nudge. */
  longLivedBranch: /^(main|master|dev|develop|stage|staging|production|release\/.*)$/,
  /** Text of the nudge. */
  planNudge:
    'Fresh workspace: no commits ahead of {base}. If the request is a new feature (not a one-off fix, ' +
    'copy tweak or question), write the plan (use the `plan-feature` skill if you have one) before any code.',
  /** null disables the index status line. */
  index: {
    name: 'code graph',
    /** Exists => index is ready. */
    readyPath: 'graphify-out/graph.json',
    /** Exists => a background build is in progress / was started. */
    buildLogPath: '.context/graphify-setup.log',
    /** CLI that builds/queries the index; null skips the "installed?" probe. */
    cli: 'graphify',
    queryHint: 'use `graphify query "…"` for broad questions',
    buildHint: 'run `graphify update` (builds graphify-out/)',
    installHint: 'install it first (`uv tool install graphifyy`), then `graphify update`',
  },
}
// ---------------------------------------------------------------------------------------------

export function shouldSuggestPlan({ branch, aheadCount, dirty }, config = CONFIG) {
  if (!branch || config.longLivedBranch.test(branch)) return false
  return aheadCount === 0 && !dirty
}

/** One-line index status. Pure; `run()` feeds it cheap filesystem probes. */
export function indexStatusLine({ hasIndex, buildLogExists, cliInstalled }, index = CONFIG.index) {
  if (!index) return ''
  if (hasIndex) return `[index] ${index.name} ready — ${index.queryHint}.`
  if (buildLogExists) return `[index] ${index.name} is still building in the background (${index.buildLogPath}).`
  if (index.cli && !cliInstalled) return `[index] ${index.name} missing and ${index.cli} not installed — ${index.installHint}.`
  return `[index] ${index.name} missing — ${index.buildHint}.`
}

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
}

function cliOnPath(cli) {
  try {
    execFileSync(cli, ['--help'], { stdio: 'ignore', timeout: 3000 })
    return true
  } catch {
    return false
  }
}

/** The lines to print (without the JSON wrapper). */
export function collect(cwd = process.cwd(), config = CONFIG) {
  const lines = []
  try {
    const branch = git(['branch', '--show-current'], cwd)
    const base = config.baseRefs.find((ref) => {
      try {
        return git(['rev-parse', '--verify', '--quiet', ref], cwd) !== ''
      } catch {
        return false
      }
    })
    if (base) {
      const aheadCount = Number(git(['rev-list', '--count', `${base}..HEAD`], cwd))
      const dirty = git(['status', '--porcelain'], cwd) !== ''
      if (shouldSuggestPlan({ branch, aheadCount, dirty }, config)) lines.push(config.planNudge.replaceAll('{base}', base))
    }
  } catch {}
  try {
    if (config.index) {
      const hasIndex = existsSync(join(cwd, config.index.readyPath))
      const buildLogExists = existsSync(join(cwd, config.index.buildLogPath))
      // Only pay for the CLI probe when there is no index to report on.
      const cliInstalled = hasIndex || buildLogExists || !config.index.cli || cliOnPath(config.index.cli)
      lines.push(indexStatusLine({ hasIndex, buildLogExists, cliInstalled }, config.index))
    }
  } catch {}
  return lines
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const lines = collect(process.env.CLAUDE_PROJECT_DIR || process.cwd())
    if (lines.length) {
      process.stdout.write(
        JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: lines.join('\n') } }),
      )
    }
  } catch {}
  process.exit(0)
}
