#!/usr/bin/env node
/**
 * PreToolUse (Bash) — blocking, fail-closed.
 *
 * Stops an agent from doing things that act "as the human" on GitHub, regardless of what the
 * permission layer allows: approving a PR, mutating `gh api` calls (REST writes, GraphQL
 * mutations, --input payloads) and raw curl/wget writes to GitHub comments/reviews. Those
 * bypass the per-command ask prompt, so a hook is the only place to stop them.
 *
 * Plain `gh pr comment` / `gh pr review --comment` are NOT matched here: publishing those is
 * left to your permission rules (ask). Add them to extraPatterns if you want them blocked too.
 *
 * Contract: exit 2 + stderr = block. Malformed stdin exits 0 — a broken payload must never turn
 * into a blanket shell outage. Wire it with `onFailure: "block"` (see hooks.*.json).
 */
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'

// ---------------------------------------------------------------------------------------------
// CONFIG — edit for your repo
// ---------------------------------------------------------------------------------------------
export const CONFIG = {
  /** Extra regex SOURCES (strings) that are blocked on top of the built-in GitHub rules. */
  extraPatterns: [],
  /** Shown to the agent on stderr when a command is blocked. */
  message:
    'Blocked by repository policy: agents may not approve pull requests or make mutating `gh api` calls. ' +
    'Comments and reviews need explicit user authorization; approval is always a human action.',
}
// ---------------------------------------------------------------------------------------------

const BUILTIN_PATTERNS = [
  // `gh pr review --approve`, `-a`, or any bundled short flag containing "a" (e.g. -ab).
  /\bgh\s+pr\s+review\b[^\n;&|]*?(?:--approve\b|(?:^|\s)-[a-zA-Z]*a[a-zA-Z]*(?=\s|$))/i,
  // Explicit write verbs on gh api.
  /\bgh\s+api\b[\s\S]*?(?:--method|-X)\s*[='"]?(?:POST|PUT|PATCH|DELETE)\b/i,
  // Implicit POST: body/event fields turn `gh api` into a write.
  /\bgh\s+api\b[\s\S]*?(?:-f|-F|--field|--raw-field)\s*[='"]?(?:body|event)\s*=/i,
  /\bgh\s+api\b[\s\S]*?--input\b/i,
  // GraphQL mutations (queries are fine).
  /\bgh\s+api\s+graphql\b[\s\S]*?\bmutation\b/i,
  // curl/wget writes straight to the GitHub API, flag before or after the URL.
  /\b(?:curl|wget)\b[\s\S]*?api\.github\.com[\s\S]*?\/(?:comments|reviews)\b[\s\S]*?(?:--data|-d|--request|-X)\b/i,
  /\b(?:curl|wget)\b[\s\S]*?(?:--data|-d|--request|-X)\b[\s\S]*?api\.github\.com[\s\S]*?\/(?:comments|reviews)\b/i,
]

function patterns(config) {
  return [...BUILTIN_PATTERNS, ...config.extraPatterns.map((src) => new RegExp(src, 'i'))]
}

/** True when `command` is an outward write the agent must not perform. */
export function isOutwardWrite(command, config = CONFIG) {
  return typeof command === 'string' && patterns(config).some((re) => re.test(command))
}

export function commandFromHookInput(input) {
  return input?.tool_input?.command ?? input?.toolInput?.command ?? input?.command ?? ''
}

export function runHook() {
  let input
  try {
    input = JSON.parse(fs.readFileSync(0, 'utf8'))
  } catch {
    process.exit(0)
  }
  if (!isOutwardWrite(commandFromHookInput(input))) process.exit(0)
  process.stderr.write(`${CONFIG.message}\n`)
  process.exit(2)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runHook()
