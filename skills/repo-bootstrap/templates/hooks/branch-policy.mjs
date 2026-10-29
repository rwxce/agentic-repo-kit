#!/usr/bin/env node
/**
 * Stop — advisory (always exits 0).
 *
 * Branch policy tripwire: warns when you are standing on a protected branch with local commits
 * that are not on its remote counterpart. Work committed directly on main/release branches
 * bypasses review (and, with diverged long-lived branches, may never reach the integration
 * branch at all). It only flags — it doesn't block.
 */
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

// ---------------------------------------------------------------------------------------------
// CONFIG — edit for your repo
// ---------------------------------------------------------------------------------------------
export const CONFIG = {
  remote: 'origin',
  /** Branches that should only advance via PR / release automation. */
  protectedBranches: ['main', 'master', 'develop', 'dev', 'stage', 'staging', 'production'],
  /** Integration branches: direct commits bypass PR review (softer hint than release branches). */
  integrationBranches: ['develop', 'dev'],
  /** Optional path of your branching/release doc, appended to the hint. null = omit. */
  docsPath: null,
}
// ---------------------------------------------------------------------------------------------

function git(args, cwd) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 32 * 1024 * 1024 })
  } catch {
    return ''
  }
}

export function buildMessage(branch, upstream, ahead, config = CONFIG) {
  const docs = config.docsPath ? ` (see ${config.docsPath})` : ''
  const lines = [`\nBranch policy — you're on '${branch}' with local commits not on '${upstream}':\n`]
  for (const l of ahead.split('\n')) lines.push(`  ${l}`)
  lines.push(
    config.integrationBranches.includes(branch)
      ? `\n  Direct commits to ${branch} bypass PR review. If intentional, push and open a PR` +
          '\n  retroactively; otherwise move this work to a feature branch.\n'
      : `\n  '${branch}' should only advance through your release/merge process${docs}. A direct` +
          '\n  commit here may not reach the integration branch and can be lost on the next release.\n',
  )
  return lines.join('\n')
}

/** The warning text, or '' when there is nothing to warn about. */
export function run(cwd = process.cwd(), config = CONFIG) {
  const branch = git(['branch', '--show-current'], cwd).trim()
  if (!config.protectedBranches.includes(branch)) return ''
  const upstream = `${config.remote}/${branch}`
  if (!git(['rev-parse', '--verify', '--quiet', upstream], cwd).trim()) return ''
  const ahead = git(['log', '--oneline', `${upstream}..HEAD`], cwd).trim()
  return ahead ? buildMessage(branch, upstream, ahead, config) : ''
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = run(process.env.CLAUDE_PROJECT_DIR || process.cwd())
  if (out) console.log(out)
  process.exit(0)
}
