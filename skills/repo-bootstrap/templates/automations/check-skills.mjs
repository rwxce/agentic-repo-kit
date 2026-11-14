#!/usr/bin/env node
/**
 * WHAT: Skill lint (CI). Every `<skills dir>/<name>/SKILL.md` must have frontmatter with a `name`
 *   and a `description`; the repo's own skills also stay under MAX_LINES lines and
 *   MAX_DESCRIPTION_WORDS words of description. Vendored (third-party) skills only get the
 *   frontmatter check: their length is upstream's call.
 * REPO SIGNAL: a skills directory that several people/agents edit. A skill without a description
 *   is never routed to, and an oversized one costs context on every session.
 * CONFIGURE: CONFIG.skillsDir (default `.rulesync/skills`, or `.claude/skills` without rulesync),
 *   MAX_LINES, MAX_DESCRIPTION_WORDS, VENDORED. Wire as `check:skills` and run it in CI.
 * Usage: node scripts/check-skills.mjs [skillsDir]    exit 0 clean, 1 with problems
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

export const CONFIG = {
  skillsDir: process.env.SKILLS_DIR ?? '.rulesync/skills',
}
export const MAX_LINES = 500
export const MAX_DESCRIPTION_WORDS = 150

/**
 * Third-party skills: exact names or `prefix*` (e.g. `'some-vendor-*'`). Empty by default: list
 * here every skill you copied or installed from elsewhere (and pin it with the vendored-skill
 * check), so the size limits apply only to skills this repo owns.
 */
export const VENDORED = []

export function isVendored(name, vendored = VENDORED) {
  return vendored.some((v) => (v.endsWith('*') ? name.startsWith(v.slice(0, -1)) : name === v))
}

/** Minimal YAML frontmatter reader: scalar, quoted and folded (`>`, `>-`, `|`) values. */
export function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  if (!match) return null
  const lines = match[1].split(/\r?\n/)
  const fields = {}
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^([A-Za-z_][\w-]*):\s*(.*)$/)
    if (!m) continue
    let value = m[2].trim()
    if (/^[>|][-+]?$/.test(value)) {
      const block = []
      while (i + 1 < lines.length && (/^\s+\S/.test(lines[i + 1]) || lines[i + 1].trim() === '')) {
        block.push(lines[++i].trim())
      }
      value = block.join(' ').trim()
    } else {
      value = value.replace(/^(["'])([\s\S]*)\1$/, '$2')
    }
    fields[m[1]] = value
  }
  return fields
}

export function checkSkill(name, text, vendored = VENDORED) {
  const problems = []
  const fm = parseFrontmatter(text)
  if (!fm) return [`${name}: missing frontmatter`]
  if (!fm.name) problems.push(`${name}: missing name`)
  if (!fm.description) problems.push(`${name}: missing description`)
  if (isVendored(name, vendored)) return problems
  const lines = text.split('\n').length
  if (lines > MAX_LINES) problems.push(`${name}: ${lines} lines (max ${MAX_LINES}) — move detail to references/`)
  const words = (fm.description ?? '').split(/\s+/).filter(Boolean).length
  if (words > MAX_DESCRIPTION_WORDS) {
    problems.push(`${name}: description has ${words} words (max ${MAX_DESCRIPTION_WORDS})`)
  }
  return problems
}

export function checkSkillsDir(dir, vendored = VENDORED) {
  const problems = []
  for (const name of readdirSync(dir).sort()) {
    const skillDir = join(dir, name)
    if (!statSync(skillDir).isDirectory()) continue
    const file = join(skillDir, 'SKILL.md')
    if (!existsSync(file)) {
      problems.push(`${name}: missing SKILL.md`)
      continue
    }
    problems.push(...checkSkill(name, readFileSync(file, 'utf8'), vendored))
  }
  return problems
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dir = process.argv[2] ?? CONFIG.skillsDir
  const problems = checkSkillsDir(dir)
  if (problems.length) {
    console.error(`Skill lint failed (${dir}):\n${problems.map((p) => `  • ${p}`).join('\n')}`)
    process.exit(1)
  }
  console.log(`Skill lint passed (${dir}).`)
}
