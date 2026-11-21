#!/usr/bin/env node
/**
 * Stop — advisory (always exits 0).
 *
 * Env var doc tripwire: reports an environment variable newly READ in code (added diff lines +
 * brand-new untracked source files) that has no mention in your env docs file. A variable set
 * only in your secrets manager and never read in code is not detectable from here.
 *
 * Reads are recognised by `readers` (JS, Python, Go, Ruby, Rust, ... out of the box); add the
 * ones your stack uses. Silent when nothing matches, so the output stays worth reading.
 *
 * Note: this file's own comments avoid literal env reads, otherwise the tripwire would report
 * itself (the readers match any file not excluded below).
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

// ---------------------------------------------------------------------------------------------
// CONFIG — edit for your repo
// ---------------------------------------------------------------------------------------------
export const CONFIG = {
  /** The file that must mention every variable (whole-word match). Missing file = hook is silent. */
  docsPath: 'docs/environment-variables.md',
  /** Refs tried, in order, to find the point this branch left the base; falls back to HEAD. */
  baseRefs: ['origin/main', 'origin/master', 'origin/develop', 'origin/dev', 'main', 'master'],
  /** Each reader needs ONE capture group holding the variable name. */
  readers: [
    /process\.env\.([A-Z][A-Z0-9_]*)/g,
    /process\.env\[\s*["']([A-Z][A-Z0-9_]*)["']\s*\]/g,
    /import\.meta\.env\.([A-Z][A-Z0-9_]*)/g,
    /os\.environ(?:\.get)?\(\s*["']([A-Z][A-Z0-9_]*)["']/g,
    /os\.environ\[\s*["']([A-Z][A-Z0-9_]*)["']\s*\]/g,
    /os\.getenv\(\s*["']([A-Z][A-Z0-9_]*)["']/g,
    /os\.Getenv\(\s*"([A-Z][A-Z0-9_]*)"/g,
    /\bENV(?:\.fetch)?[\[(]\s*["']([A-Z][A-Z0-9_]*)["']/g,
    /env::var\(\s*"([A-Z][A-Z0-9_]*)"/g,
  ],
  /** Paths whose env reads are not app config: vendored deps, generated agent config, tests, prose. */
  excludedPath:
    /(^|\/)(node_modules|\.next|dist|build|vendor|\.venv|\.claude|\.cursor|\.codex|\.agents|\.opencode|\.rulesync)\/|\.(test|spec)\.[a-z]+$|(^|\/)(tests?|__tests__)\/|\.mdx?$/,
  /** Untracked files are read in full, so only these extensions are scanned. */
  sourceExt: /\.(tsx?|jsx?|mjs|cjs|py|go|rb|rs|php|java|kt|vue|svelte)$/,
  /** Message tail. */
  hint: 'Add an entry to the env docs (and to your secrets manager, if it isn\'t there yet) before shipping.',
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

const documented = (docs, name) => new RegExp(`(?<![A-Za-z0-9_])${name}(?![A-Za-z0-9_])`).test(docs)

/** Variable names read in `text` (unique). */
export function envReads(text, readers = CONFIG.readers) {
  const names = new Set()
  for (const re of readers) for (const m of text.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`))) names.add(m[1])
  return [...names]
}

/**
 * @param {string} diff unified=0 diff text
 * @param {{file: string, contents: string}[]} untracked brand-new files, full contents
 * @returns {Map<string, Set<string>>} undocumented variable -> files
 */
export function findUndocumented({ diff, untracked = [], docs, config = CONFIG }) {
  const hits = new Map()
  const record = (name, file) => {
    if (documented(docs, name)) return
    if (!hits.has(name)) hits.set(name, new Set())
    hits.get(name).add(file)
  }
  let currentFile = ''
  let skip = false
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ b/')) {
      currentFile = line.slice(6).trim()
      skip = config.excludedPath.test(currentFile)
      continue
    }
    if (line.startsWith('+++') || line.startsWith('---')) continue
    if (skip || !line.startsWith('+')) continue
    for (const name of envReads(line.slice(1), config.readers)) record(name, currentFile)
  }
  for (const { file, contents } of untracked) {
    if (config.excludedPath.test(file)) continue
    for (const name of envReads(contents, config.readers)) record(name, file)
  }
  return hits
}

export function formatReport(hits, config = CONFIG) {
  const lines = [`\nEnv var doc tripwire — new env reference(s) not mentioned in ${config.docsPath}:\n`]
  for (const [name, files] of hits) lines.push(`  • ${name}\n      ${[...files].join(', ')}`)
  lines.push(`\n  ${config.hint}\n`)
  return lines.join('\n')
}

export function run(cwd = process.cwd(), config = CONFIG) {
  let docs
  try {
    docs = readFileSync(join(cwd, config.docsPath), 'utf8')
  } catch {
    return ''
  }
  const diff = git(['diff', '--unified=0', resolveBase(config.baseRefs, cwd)], cwd)
  const untracked = []
  for (const file of git(['ls-files', '--others', '--exclude-standard'], cwd).split('\n').map((p) => p.trim())) {
    if (!file || !config.sourceExt.test(file) || config.excludedPath.test(file)) continue
    try {
      untracked.push({ file, contents: readFileSync(join(cwd, file), 'utf8') })
    } catch {
      // vanished, unreadable or a dangling entry — not our problem
    }
  }
  if (!diff && untracked.length === 0) return ''
  const hits = findUndocumented({ diff, untracked, docs, config })
  return hits.size ? formatReport(hits, config) : ''
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = run(process.env.CLAUDE_PROJECT_DIR || process.cwd())
  if (out) console.log(out)
  process.exit(0)
}
