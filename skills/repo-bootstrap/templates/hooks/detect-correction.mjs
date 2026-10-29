#!/usr/bin/env node
/**
 * UserPromptSubmit — advisory.
 *
 * Spots a prompt where the person corrects the agent (en/es/ca), logs it to
 * `.context/reflect/corrections.jsonl` (keep that path gitignored) and tells the agent to run a
 * `reflect` skill before ending the turn, so repeated corrections become lasting rules.
 * The log lets the skill tell a one-off from a pattern across sessions.
 *
 * Only cues that point back at something already said or done count — a plain first-time
 * instruction ("don't use emojis") is not a correction.
 *
 * Contract: stdin `{ prompt }`; prints `additionalContext` or nothing. Malformed stdin exits 0.
 */
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// ---------------------------------------------------------------------------------------------
// CONFIG — edit for your repo
// ---------------------------------------------------------------------------------------------
export const CONFIG = {
  skill: 'reflect',
  /** Where hits are appended, relative to the project dir. */
  logPath: '.context/reflect/corrections.jsonl',
  /** Context injected on a hit. {skill} and {logPath} are replaced. */
  context:
    'The user may be correcting you. Fix what they asked, then, before ending this turn, apply the ' +
    '`{skill}` skill: check {logPath} and memory for the same correction and, if it repeats or ' +
    'states a lasting preference, propose (do not write yet) a rule in your agent config or a feedback memory.',
  patterns: [
    // Català
    /\bja t'he dit\b/i,
    /\bt'(?:ho )?he dit\b/i,
    /\bet vaig (?:dir|demanar)\b/i,
    /\bho has (?:tornat a|fet una altra vegada)\b/i,
    /\bhas tornat a\b/i,
    /\bno (?:és|era) (?:això|aixo) (?:el )?que (?:t'he|et vaig) (?:dit|demanat)/i,
    /\bno m'has fet cas\b/i,
    /\bno t'he demanat\b/i,
    // Castellano
    /\bya te (?:dije|he dicho)\b/i,
    /\bte (?:lo )?(?:dije|he dicho)\b/i,
    /\b(?:lo )?has vuelto a\b/i,
    /\bno (?:es|era) (?:eso )?lo que te (?:dije|pedí|he pedido)\b/i,
    /\bno te he pedido\b/i,
    // English
    /\bi (?:already )?told you\b/i,
    /\bi (?:already )?said (?:not to|to|that)\b/i,
    /\b(?:that's|that is) not what i (?:asked|wanted|said)\b/i,
    /\bnot what i asked\b/i,
    /\bi asked you (?:not )?to\b/i,
    /\byou keep (?:doing|adding|using|putting|making|forgetting|ignoring|breaking|changing)\b/i,
    /\byou (?:did it|did that|did this|keep doing|are doing it) again\b/i,
  ],
}
// ---------------------------------------------------------------------------------------------

/** The first correction cue in `prompt`, or null. */
export function detectCorrection(prompt, patterns = CONFIG.patterns) {
  if (typeof prompt !== 'string') return null
  // Harness-injected turns (background task notifications) aren't the person speaking.
  if (/<task-notification>|\[SYSTEM NOTIFICATION/.test(prompt)) return null
  for (const re of patterns) {
    const m = prompt.match(re)
    if (m) return m[0].trim()
  }
  return null
}

export const reflectContext = (config = CONFIG) =>
  config.context.replaceAll('{skill}', config.skill).replaceAll('{logPath}', config.logPath)

/** Appends one JSON line to the log; best effort, never throws. Returns the file path or null. */
export function record(prompt, cue, projectDir = projectRoot(), config = CONFIG) {
  try {
    const file = path.join(projectDir, config.logPath)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    const entry = { at: new Date().toISOString(), cue, prompt: prompt.slice(0, 400) }
    fs.appendFileSync(file, `${JSON.stringify(entry)}\n`)
    return file
  } catch {
    return null
  }
}

function projectRoot() {
  return process.env.CLAUDE_PROJECT_DIR || process.cwd()
}

export function runHook() {
  let input
  try {
    input = JSON.parse(fs.readFileSync(0, 'utf8'))
  } catch {
    process.exit(0)
  }
  const prompt = input?.prompt ?? input?.user_prompt ?? ''
  const cue = detectCorrection(prompt)
  if (!cue) process.exit(0)
  record(prompt, cue)
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: reflectContext() },
    }),
  )
  process.exit(0)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runHook()
