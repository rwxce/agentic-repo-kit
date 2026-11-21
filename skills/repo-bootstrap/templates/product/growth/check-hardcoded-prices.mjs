#!/usr/bin/env node
/**
 * WHAT: Fails when UI source or message files contain a literal price ("$19", "19 €", "€9.99/mo",
 *   "USD 20"). Prices come from the billing provider's catalog or the plans config; a literal in a
 *   component or a translation drifts the first time the price changes, and in one locale only.
 * REPO SIGNAL: a pricing page, plan cards or upgrade prompts, and a billing provider.
 * CONFIGURE: CONFIG.roots, CONFIG.extensions, CONFIG.allow (the plans config, tests, legal pages
 *   that must quote a price verbatim). Advisory by default; `--strict` exits 1 for CI.
 * Usage: node scripts/check-hardcoded-prices.mjs [--strict]
 * Zero dependencies. It matches currency symbols and ISO codes next to a number; a price built from
 * variables passes, which is the point.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

export const CONFIG = {
  roots: ['app', 'src', 'components', 'messages'],
  extensions: ['.tsx', '.jsx', '.ts', '.vue', '.svelte', '.json'],
  allow: [/(^|\/)plans\.ts$/, /\.test\./, /(^|\/)legal\//, /(^|\/)node_modules\//],
}

const SYMBOL = '[$€£¥₹]'
const CODE = '(?:USD|EUR|GBP|JPY|INR|CAD|AUD)'
const NUM = '\\d{1,6}(?:[.,]\\d{1,2})?'
export const PRICE = new RegExp(
  `(?:${SYMBOL}\\s?${NUM}(?![\\w{])|(?<![\\w.])${NUM}\\s?${SYMBOL}|\\b${CODE}\\s?${NUM}\\b|(?<![\\w.])${NUM}\\s?${CODE}\\b)`,
  'u',
)

/** Lines with a literal price: [{ line, text }]. Template placeholders like `${price}` never match. */
export function findPrices(text) {
  return text.split('\n').flatMap((t, i) => (PRICE.test(t) ? [{ line: i + 1, text: t.trim() }] : []))
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue
    const full = join(dir, name)
    statSync(full).isDirectory() ? walk(full, out) : out.push(relative(process.cwd(), full).split(sep).join('/'))
  }
  return out
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const strict = process.argv.includes('--strict')
  const hits = CONFIG.roots.flatMap((r) => walk(r))
    .filter((f) => CONFIG.extensions.some((e) => f.endsWith(e)) && !CONFIG.allow.some((re) => re.test(f)))
    .flatMap((f) => findPrices(readFileSync(f, 'utf8')).map((h) => `${f}:${h.line}  ${h.text}`))
  if (hits.length) {
    console[strict ? 'error' : 'warn'](`Hard-coded prices (${hits.length}); read them from the plans config or the provider:\n${hits.map((h) => `  • ${h}`).join('\n')}`)
    process.exit(strict ? 1 : 0)
  }
  console.log('No hard-coded prices.')
}
