#!/usr/bin/env node
/**
 * Stop — advisory (always exits 0).
 *
 * Compliance tripwire: when this branch's diff ADDS a line that sends user data to a third
 * party, writes to the user's device, bypasses a consent gate, persists a new data model or
 * calls a new outbound host — or touches legal/consent files — print a reminder to check your
 * compliance records before shipping. A compliance question is not mechanically decidable, and a
 * hook that blocks work gets switched off: its job is only to make sure nobody ships such a
 * change without having been asked once.
 *
 * Content patterns match ADDED lines only (removing a tracking call is not a concern).
 * Silent when nothing matches. Tune CONFIG to your stack and your legal texts.
 */
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

// ---------------------------------------------------------------------------------------------
// CONFIG — edit for your repo
// ---------------------------------------------------------------------------------------------
export const CONFIG = {
  /** Refs tried, in order, to find the point this branch left the base; falls back to HEAD. */
  baseRefs: ['origin/main', 'origin/master', 'origin/develop', 'origin/dev', 'main', 'master'],
  /** Matched against ADDED lines. */
  contentTripwires: [
    {
      label: 'User data sent to a third party (analytics / tracking / monitoring SDK)',
      pattern: /\b(?:posthog|mixpanel|amplitude|segment|heap|hotjar|fullstory|logrocket|datadog|intercom|clarity)\b|\bgtag\(|\bfbq\(|googletagmanager|google-analytics|@sentry\/|sentry_sdk|analytics\.(?:track|identify|page)\(/i,
    },
    {
      label: "Storage written on the user's device",
      pattern: /document\.cookie|\bcookies\(\)\.set|cookieStore\.set|\bres\.cookie\(|\bset_cookie\(|\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b/,
    },
    {
      label: 'A consent gate is being bypassed or re-gated',
      pattern: /bypass_?consent|skip_?consent|consent\s*[:=]\s*true|opt_?in_capturing|opt_?out_capturing|hasAcceptedAnalytics|hasConsent/i,
    },
    {
      label: 'New personal data persisted (new table / model / collection)',
      pattern: /\bCREATE\s+TABLE\b|\bpgTable\(|\bdefineTable\(|\bsqliteTable\(|^\s*model\s+\w+\s*\{|\bmodels\.Model\b|\bmongoose\.model\(/i,
    },
    {
      label: 'New outbound host (possible new subprocessor)',
      pattern: /\bfetch\(\s*[`"']https?:\/\/|\baxios\.(?:get|post|put|patch|delete|request)\(\s*[`"']https?:\/\/|\brequests\.(?:get|post|put|patch|delete)\(\s*["']https?:\/\//,
    },
  ],
  /** Matched against changed file paths: touching these areas is itself the signal. */
  pathTripwires: [
    { label: 'Consent logic', pattern: /cookie-?consent|consent-?banner|global-?privacy-?control/i },
    { label: 'Published legal text', pattern: /(^|\/)(legal|privacy|terms)(\/|[-_.])/i },
    { label: 'Compliance records', pattern: /^compliance\// },
  ],
  /** Vendored / generated paths: ignored entirely (content AND path tripwires). */
  vendoredPath:
    /(^|\/)(node_modules|\.next|dist|build|vendor|\.venv|\.claude|\.cursor|\.codex|\.agents|\.opencode|\.rulesync)\/|(^|\/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock)$/,
  /** Paths whose ADDED LINES are not scanned (tests stub storage constantly; docs quote SDKs). Path tripwires still apply. */
  excludedPath: /\.(test|spec)\.[a-z]+$|(^|\/)(tests?|__tests__)\/|\.mdx?$/,
  /** What the reader should do. */
  reminder:
    'Before shipping: check your compliance inventory, confirm the change matches the published ' +
    'legal texts, and log any mismatch in your policy/code discrepancy file.',
  filesShown: 4,
}
// ---------------------------------------------------------------------------------------------

function git(args, cwd) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 32 * 1024 * 1024 })
  } catch {
    return ''
  }
}

/** The point this branch left the base; HEAD (= uncommitted changes only) when none resolves. */
export function resolveBase(baseRefs, cwd) {
  for (const ref of baseRefs) {
    const base = git(['merge-base', 'HEAD', ref], cwd).trim()
    if (base) return base
  }
  return 'HEAD'
}

/** @returns {Map<string, Set<string>>} label -> files */
export function scanDiff(diff, config = CONFIG) {
  const hits = new Map()
  const record = (label, file) => {
    if (!file) return
    if (!hits.has(label)) hits.set(label, new Set())
    hits.get(label).add(file)
  }
  let currentFile = ''
  let skip = false
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ b/')) {
      currentFile = line.slice(6).trim()
      const vendored = config.vendoredPath.test(currentFile)
      skip = vendored || config.excludedPath.test(currentFile)
      if (!vendored) for (const { label, pattern } of config.pathTripwires) if (pattern.test(currentFile)) record(label, currentFile)
      continue
    }
    if (line.startsWith('+++') || line.startsWith('---')) continue
    if (skip || !line.startsWith('+')) continue
    const added = line.slice(1)
    for (const { label, pattern } of config.contentTripwires) if (pattern.test(added)) record(label, currentFile)
  }
  return hits
}

export function formatReport(hits, config = CONFIG) {
  const out = ['\nCompliance tripwire — this branch touches legally relevant surface:\n']
  for (const [label, files] of hits) {
    const list = [...files]
    const rest = list.length > config.filesShown ? ` (+${list.length - config.filesShown} more)` : ''
    out.push(`  • ${label}\n      ${list.slice(0, config.filesShown).join(', ')}${rest}`)
  }
  out.push(`\n  ${config.reminder}\n`)
  return out.join('\n')
}

export function run(cwd = process.cwd(), config = CONFIG) {
  const diff = git(['diff', '--unified=0', resolveBase(config.baseRefs, cwd)], cwd)
  if (!diff) return ''
  const hits = scanDiff(diff, config)
  return hits.size ? formatReport(hits, config) : ''
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = run(process.env.CLAUDE_PROJECT_DIR || process.cwd())
  if (out) console.log(out)
  process.exit(0)
}
