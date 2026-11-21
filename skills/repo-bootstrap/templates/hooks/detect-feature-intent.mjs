#!/usr/bin/env node
/**
 * UserPromptSubmit — advisory.
 *
 * Spots a prompt that asks for a NEW feature (languages in ENABLED_LANGUAGES) and injects a one-line context telling
 * the agent to follow your planning skill before writing the plan. Deliberately narrow:
 * bugfixes ("fix"), questions and one-off tweaks must not trigger it — a miss is
 * cheap, a false positive is noise.
 *
 * Contract: stdin `{ prompt }`; prints `hookSpecificOutput.additionalContext` or nothing.
 * Malformed stdin exits 0.
 */
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'

// ---------------------------------------------------------------------------------------------
// CONFIG — edit for your repo
// ---------------------------------------------------------------------------------------------
/**
 * Cue regexes per language. Keep them anchored on "I want to build/add ..." cues. Add a language
 * by adding a key here and listing it in ENABLED_LANGUAGES.
 */
export const PATTERNS = {
  en: [
    /\b(?:add|build|implement|create) (?:a |an |the )?(?:new )?feature\b/i,
    /\bnew feature\b/i,
    /\bi want (?:users|customers|people) to\b/i,
    /\bi want to (?:add|build|implement|create)\b/i,
    /\bwe need (?:an? |to (?:add|build) (?:an? )?)(?:new )?(?:feature|flow|screen|integration)\b/i,
  ],
  // Opt-in example: add 'es' to ENABLED_LANGUAGES if your team writes prompts in Spanish.
  es: [
    /\bquiero (?:hacer|añadir|agregar|implementar|crear|construir|montar) (?:una? |la |el |los |las )?(?:nueva |nuevo |nuevas |nuevos )?(?:funcionalidad|feature|pantalla|flujo|sección|integración|sistema|módulo)/i,
    /\bquiero que (?:los )?(?:usuarios|clientes|el usuario)\b/i,
    /\bnuevas? funcionalidad(?:es)?\b/i,
    /\bquiero (?:añadir|agregar|implementar|construir)\b/i,
  ],
}

/** Languages whose PATTERNS are active. English only by default. */
export const ENABLED_LANGUAGES = ['en']

export const CONFIG = {
  /** The skill the agent is routed to. */
  skill: 'plan-feature',
  /** Context injected on a hit. {skill} is replaced. */
  context:
    'Feature request detected → classify its size (small/normal/big) and follow the ' +
    '`{skill}` skill before writing the plan.',
  patterns: ENABLED_LANGUAGES.flatMap((lang) => PATTERNS[lang] ?? []),
}
// ---------------------------------------------------------------------------------------------

/** The first feature-intent cue in `prompt`, or null. */
export function detectFeatureIntent(prompt, patterns = CONFIG.patterns) {
  if (typeof prompt !== 'string') return null
  // Harness-injected turns (background task notifications) aren't the person speaking.
  if (/<task-notification>|\[SYSTEM NOTIFICATION/.test(prompt)) return null
  for (const re of patterns) {
    const m = prompt.match(re)
    if (m) return m[0].trim()
  }
  return null
}

export const featureContext = (config = CONFIG) => config.context.replaceAll('{skill}', config.skill)

export function runHook() {
  let input
  try {
    input = JSON.parse(fs.readFileSync(0, 'utf8'))
  } catch {
    process.exit(0)
  }
  const prompt = input?.prompt ?? input?.user_prompt ?? ''
  if (!detectFeatureIntent(prompt)) process.exit(0)
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: featureContext() },
    }),
  )
  process.exit(0)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runHook()
