#!/usr/bin/env node
/**
 * WHAT: Fails if any locale file's nested key set differs from the source locale's (missing OR
 * extra keys). Zero dependencies; runs on plain Node.
 * REPO SIGNAL: more than one file in a messages/translations directory (en.json, es.json, ...).
 * Type-safe i18n libraries catch "key used in code but absent from the source locale"; they do
 * NOT catch "key present in en.json but missing in es.json" -- that is this script.
 * CONFIGURE: env vars or edit CONFIG. Wire as `"check:i18n": "node scripts/i18n-parity.mjs"` in
 * package.json, run it in CI (ci.yml calls `run --if-present check:i18n`) and optionally pre-push.
 *   I18N_DIR=messages I18N_SOURCE=en node scripts/i18n-parity.mjs
 * Also exports `compareKeys` for a unit test.
 */
import { readFileSync, readdirSync } from "node:fs"
import { basename, join } from "node:path"
import { pathToFileURL } from "node:url"

const CONFIG = {
  dir: process.env.I18N_DIR ?? "messages",
  source: process.env.I18N_SOURCE ?? "en", // the locale every other file is compared against
  ext: ".json",
}

export function collectKeys(obj, prefix = "") {
  const keys = new Set()
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const nested of collectKeys(value, path)) keys.add(nested)
    } else keys.add(path)
  }
  return keys
}

export function compareKeys(source, other) {
  return {
    missing: [...source].filter((k) => !other.has(k)).sort(),
    extra: [...other].filter((k) => !source.has(k)).sort(),
  }
}

function main() {
  const dir = join(process.cwd(), CONFIG.dir)
  const files = readdirSync(dir).filter((f) => f.endsWith(CONFIG.ext)).sort()
  const sourceFile = `${CONFIG.source}${CONFIG.ext}`
  if (!files.includes(sourceFile)) {
    console.error(`i18n-parity: source locale ${sourceFile} not found in ${CONFIG.dir}`)
    process.exit(2)
  }
  const load = (f) => JSON.parse(readFileSync(join(dir, f), "utf8"))
  const source = collectKeys(load(sourceFile))
  let failed = false

  for (const file of files) {
    if (file === sourceFile) continue
    const { missing, extra } = compareKeys(source, collectKeys(load(file)))
    if (!missing.length && !extra.length) continue
    failed = true
    console.error(`\n✗ ${basename(file, CONFIG.ext)} out of sync with ${CONFIG.source}:`)
    for (const k of missing) console.error(`    missing: ${k}`)
    for (const k of extra) console.error(`    extra:   ${k}`)
  }
  if (failed) process.exit(1)
  console.log(`✓ i18n in sync -- ${source.size} keys across ${files.length} locale files`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
