#!/usr/bin/env node
/**
 * WHAT: Translation glossary check. For every message whose source-locale text contains a glossary
 *   term, the same key in each other locale must contain one of the term's approved forms (or the
 *   term itself when it is marked "*": never translated). `sourceForms` lists the source word's
 *   inflections ("post", "posts"). Words listed under `avoid` must not
 *   appear in that locale at all. Pairs with `arch-tests/i18n-parity.mjs` (same keys everywhere):
 *   parity says a string exists, this says it uses the agreed words.
 * REPO SIGNAL: two or more locale files and product terms that keep being translated differently.
 * CONFIGURE: CONFIG.glossary, CONFIG.messagesDir, CONFIG.ext. Advisory by default (prints, exits 0);
 *   `--strict` exits 1, for CI once the baseline is clean. Inflected forms are listed explicitly
 *   in the glossary; the check does no stemming.
 * Usage: node scripts/check-glossary.mjs [--strict]
 */
import { readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { pathToFileURL } from 'node:url'

export const CONFIG = {
  glossary: process.env.GLOSSARY ?? 'docs/glossary.json',
  messagesDir: process.env.I18N_DIR ?? 'messages',
  ext: '.json',
}

/** Flattens nested messages into { 'a.b.c': 'text' }; arrays become 'a.0', 'a.1'. */
export function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object') flatten(v, key, out)
    else if (typeof v === 'string') out[key] = v
  }
  return out
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** Whole-word, case-insensitive, Unicode-aware match. */
export const hasWord = (text, word) =>
  new RegExp(`(?<![\\p{L}\\p{N}])${escape(word)}(?![\\p{L}\\p{N}])`, 'iu').test(text)

const forms = (term, locale) => {
  const t = term.translations ?? {}
  const v = t[locale] ?? t['*']
  return v === undefined ? null : Array.isArray(v) ? v : [v]
}

/** messages: { [locale]: flatMessages }. Returns problem lines. */
export function checkGlossary(glossary, messages) {
  const source = messages[glossary.sourceLocale]
  if (!source) return [`source locale "${glossary.sourceLocale}" has no messages file`]
  const problems = []
  for (const [locale, flat] of Object.entries(messages)) {
    if (locale === glossary.sourceLocale) continue
    for (const term of glossary.terms) {
      const allowed = forms(term, locale)
      if (allowed) {
        const sourceForms = term.sourceForms ?? [term.term]
        for (const [key, text] of Object.entries(source)) {
          if (!sourceForms.some((f) => hasWord(text, f))) continue
          const target = flat[key]
          if (target === undefined) continue // missing keys are i18n-parity's job
          if (!allowed.some((f) => hasWord(target, f))) {
            problems.push(`${locale} ${key}: "${term.term}" should be ${allowed.map((f) => `"${f}"`).join(' / ')}`)
          }
        }
      }
      for (const word of term.avoid?.[locale] ?? []) {
        for (const [key, text] of Object.entries(flat)) {
          if (hasWord(text, word)) problems.push(`${locale} ${key}: avoid "${word}" (${term.note ?? term.term})`)
        }
      }
    }
  }
  return problems
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const strict = process.argv.includes('--strict')
  const glossary = JSON.parse(readFileSync(CONFIG.glossary, 'utf8'))
  const messages = Object.fromEntries(
    readdirSync(CONFIG.messagesDir)
      .filter((f) => f.endsWith(CONFIG.ext))
      .map((f) => [basename(f, CONFIG.ext), flatten(JSON.parse(readFileSync(join(CONFIG.messagesDir, f), 'utf8')))]),
  )
  const problems = checkGlossary(glossary, messages)
  if (problems.length) {
    console[strict ? 'error' : 'warn'](`Glossary check: ${problems.length} problem(s)\n${problems.map((p) => `  • ${p}`).join('\n')}`)
    process.exit(strict ? 1 : 0)
  }
  console.log('Glossary check passed.')
}
