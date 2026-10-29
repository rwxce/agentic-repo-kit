#!/usr/bin/env node
/**
 * UserPromptSubmit — advisory.
 *
 * Spots a prompt that asks for a NEW feature (en/es/ca) and injects a one-line context telling
 * the agent to follow your planning skill before writing the plan. Deliberately narrow:
 * bugfixes ("fix", "arregla"), questions and one-off tweaks must not trigger it — a miss is
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
export const CONFIG = {
  /** The skill the agent is routed to. */
  skill: 'plan-feature',
  /** Context injected on a hit. {skill} is replaced. */
  context:
    'Feature request detected → classify its size (small/normal/big) and follow the ' +
    '`{skill}` skill before writing the plan.',
  /** Add languages by appending regexes. Keep them anchored on "I want to build/add ..." cues. */
  patterns: [
    // Català
    /\bvull (?:fer|afegir|implementar|crear|construir|muntar) (?:una? |la |el |els |les )?(?:nova |nou |noves |nous )?(?:funcionalitat|feature|pantalla|flux|secció|integració|sistema|mòdul)/i,
    /\bvull que (?:els )?(?:usuaris|clients|l'usuari)\b/i,
    /\b(?:nova|noves) funcionalitats?\b/i,
    /\bvull (?:afegir|implementar|crear|construir)\b/i,
    // Castellano
    /\bquiero (?:hacer|añadir|agregar|implementar|crear|construir|montar) (?:una? |la |el |los |las )?(?:nueva |nuevo |nuevas |nuevos )?(?:funcionalidad|feature|pantalla|flujo|sección|integración|sistema|módulo)/i,
    /\bquiero que (?:los )?(?:usuarios|clientes|el usuario)\b/i,
    /\bnuevas? funcionalidad(?:es)?\b/i,
    /\bquiero (?:añadir|agregar|implementar|construir)\b/i,
    // English
    /\b(?:add|build|implement|create) (?:a |an |the )?(?:new )?feature\b/i,
    /\bnew feature\b/i,
    /\bi want (?:users|customers|people) to\b/i,
    /\bi want to (?:add|build|implement|create)\b/i,
    /\bwe need (?:an? |to (?:add|build) (?:an? )?)(?:new )?(?:feature|flow|screen|integration)\b/i,
  ],
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
