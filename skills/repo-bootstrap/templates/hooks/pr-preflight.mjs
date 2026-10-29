#!/usr/bin/env node
/**
 * Stop (advisory) / CI (blocking with --strict).
 *
 * PR preflight — catches changes that make the diff you already wrote unsafe to ship, not
 * changes that expand what it does:
 *   1. a real dotenv file committed (only the example/template files may be);
 *   2. a dotenv ignore line removed from .gitignore;
 *   3. a file over the size limit, or a media master (video/audio/gif) that belongs in an
 *      asset repo or LFS, not in git history.
 *
 * Default: print findings, exit 0 (mid-work blocking a turn would be absurd).
 * `--strict`: exit 1 on any finding — wire this into CI so a PR cannot merge with a violation.
 *
 * In CI the base is not guessed: GITHUB_BASE_REF / PR_BASE_REF (pull_request) or PUSH_BEFORE_SHA
 * (push) are honored first; locally the baseRefs list is probed.
 */
import { execFileSync } from 'node:child_process'
import { statSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

// ---------------------------------------------------------------------------------------------
// CONFIG — edit for your repo
// ---------------------------------------------------------------------------------------------
export const CONFIG = {
  baseRefs: ['origin/main', 'origin/master', 'origin/develop', 'origin/dev', 'main', 'master'],
  /** Files over this many bytes are flagged... */
  maxBytes: 2 * 1024 * 1024,
  /** ...unless they live under one of these prefixes (web assets, fixtures...). */
  sizeExemptPrefixes: ['public/', 'static/', 'assets/'],
  /** Always flagged regardless of size: heavy media sources. */
  mediaMasters: /\.(mp4|mov|gif|wav|aif|aiff|mp3|m4a|flac|psd|ai|sketch|blend)$/i,
  /** The only dotenv-style files that may be committed. */
  envAllowed: ['.env.example', '.env.local.example', '.env.sample', '.env.template', '.env.dist'],
  /** Where heavy files should go instead (shown in the message). */
  heavyFileAdvice: 'Keep heavy sources in an asset repo / Git LFS and commit only the small web deliverables.',
}
// ---------------------------------------------------------------------------------------------

function git(args, cwd) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 32 * 1024 * 1024 })
  } catch {
    return ''
  }
}

/** Why `file` (repo-relative path, size in bytes) must not be committed, or null if it may. */
export function heavyFileReason(file, bytes, config = CONFIG) {
  if (config.mediaMasters.test(file)) return 'media master — keep sources out of git history'
  if (bytes > config.maxBytes && !config.sizeExemptPrefixes.some((p) => file.startsWith(p))) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB (limit ${(config.maxBytes / 1024 / 1024).toFixed(1)} MB) outside ${config.sizeExemptPrefixes.join(', ')}`
  }
  return null
}

/** Is `file` a real (non-template) dotenv file? Matches .env, .env.production.local, apps/x/.env... */
export function isRealEnvFile(file, config = CONFIG) {
  const base = file.split('/').pop() ?? ''
  return /^\.env(\..+)?$/.test(base) && !config.envAllowed.includes(base)
}

/** Did this .gitignore diff remove a real dotenv ignore rule without re-adding an equivalent? */
export function envIgnoreWeakened(gitignoreDiff) {
  const body = (l) => l.slice(1).trim()
  const isRule = (l) => {
    const b = body(l)
    return b && !b.startsWith('#') && !b.startsWith('!') && /\.env/.test(b)
  }
  const removed = gitignoreDiff.split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---') && isRule(l))
  const added = gitignoreDiff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++') && isRule(l))
  // A removed comment or negation doesn't weaken anything; a rewritten rule (.env -> .env*) doesn't either.
  return removed.length > 0 && added.length === 0
}

/** The point this branch left the base (CI event first, then local probes); null when unknown. */
export function resolveBase(config = CONFIG, cwd = process.cwd(), env = process.env) {
  const baseRef = env.GITHUB_BASE_REF || env.PR_BASE_REF
  if (baseRef) {
    const b = git(['merge-base', 'HEAD', `origin/${baseRef}`], cwd).trim() || git(['merge-base', 'HEAD', baseRef], cwd).trim()
    if (b) return b
  }
  const pushBefore = env.PUSH_BEFORE_SHA
  if (pushBefore && !/^0+$/.test(pushBefore)) {
    const b = git(['rev-parse', '--verify', '--quiet', `${pushBefore}^{commit}`], cwd).trim()
    if (b) return b
  }
  for (const ref of config.baseRefs) {
    const base = git(['merge-base', 'HEAD', ref], cwd).trim()
    if (base) return base
  }
  return git(['rev-parse', '--verify', '--quiet', 'HEAD'], cwd).trim() ? 'HEAD' : null
}

/** @returns {{label: string, detail: string}[]} */
export function findProblems(cwd = process.cwd(), config = CONFIG, env = process.env) {
  const base = resolveBase(config, cwd, env)
  if (!base) return []
  const problems = []

  if (envIgnoreWeakened(git(['diff', '--unified=0', base, '--', '.gitignore'], cwd))) {
    problems.push({
      label: '.gitignore no longer ignores .env',
      detail: 'A line matching .env was removed from .gitignore. Restore it — real secrets must never be committed.',
    })
  }

  // Added files plus untracked ones (a Stop hook runs before anything is staged).
  const added = [
    ...git(['diff', '--name-only', '--diff-filter=A', base], cwd).split('\n'),
    ...git(['ls-files', '--others', '--exclude-standard'], cwd).split('\n'),
  ].filter(Boolean)
  for (const file of new Set(added)) {
    if (isRealEnvFile(file, config)) {
      problems.push({
        label: `Real env file committed: ${file}`,
        detail: `Only ${config.envAllowed.join(' / ')} may be committed. Remove it from the diff and rotate any secrets it held.`,
      })
    }
  }

  // A, M and R: a tracked file that grows past the limit or is renamed out of an exempt dir counts too.
  const touched = [
    ...git(['diff', '--name-only', '--diff-filter=AMR', base], cwd).split('\n'),
    ...git(['ls-files', '--others', '--exclude-standard'], cwd).split('\n'),
  ].filter(Boolean)
  for (const file of new Set(touched)) {
    let bytes
    try {
      bytes = statSync(join(cwd, file)).size
    } catch {
      continue
    }
    const reason = heavyFileReason(file, bytes, config)
    if (reason) problems.push({ label: `Heavy file committed: ${file}`, detail: `${reason}. ${config.heavyFileAdvice}` })
  }
  return problems
}

export function formatReport(problems) {
  const lines = ['\nPR preflight — this branch ships unsafe, not just incomplete:\n']
  for (const { label, detail } of problems) lines.push(`  • ${label}\n      ${detail}`)
  lines.push('')
  return lines.join('\n')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const strict = process.argv.includes('--strict')
  const problems = findProblems(process.env.CLAUDE_PROJECT_DIR || process.cwd())
  if (problems.length) console.log(formatReport(problems))
  process.exit(strict && problems.length ? 1 : 0)
}
