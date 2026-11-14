/**
 * WHAT: Routing regression pack. (1) Every case in skill-routing.cases.json runs through the
 *   feature-intent hook and must route (or not) as expected. (2) Every own skill's description must
 *   name its trigger phrases, because the description is all the model sees when choosing a skill.
 * REPO SIGNAL: a prompt hook that routes to a planning skill, and several own skills whose
 *   descriptions get edited over time. A tightened regex or a trimmed description silently stops
 *   routing; this turns that into a failing test.
 * CONFIGURE: in the target repo this file, check-skills.mjs and detect-feature-intent.mjs all live
 *   in `scripts/`: change the hook import to './detect-feature-intent.mjs' and set SKILLS_DIR to the
 *   skills source (`.rulesync/skills` or `.claude/skills`). Skills listed in the cases but absent
 *   from SKILLS_DIR are skipped, not failed.
 * Run: node --test scripts/skill-routing.test.mjs
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseFrontmatter } from './check-skills.mjs'
import { detectFeatureIntent } from '../hooks/detect-feature-intent.mjs'

// Default: this kit's template skills. Target repo: '.rulesync/skills' (resolved from the repo root).
const SKILLS_DIR = process.env.SKILLS_DIR ?? fileURLToPath(new URL('../skills/', import.meta.url))

const cases = JSON.parse(readFileSync(new URL('./skill-routing.cases.json', import.meta.url), 'utf8'))

test('feature-intent routing (plan-feature)', async (t) => {
  for (const c of cases.featureIntent.filter((c) => !c.knownFalsePositive)) {
    await t.test(`${c.prompt} → ${c.expect}`, () => {
      assert.equal(detectFeatureIntent(c.prompt) !== null, c.expect)
    })
  }
  // Documented misses: they must still misfire, so fixing the regex shows up here and the case can
  // move to the active list.
  for (const c of cases.featureIntent.filter((c) => c.knownFalsePositive)) {
    await t.test(`known false positive still fires: ${c.prompt}`, () => {
      assert.notEqual(detectFeatureIntent(c.prompt), null)
    })
  }
})

test('own skills name their triggers', async (t) => {
  for (const [name, { triggers, skipFor = [] }] of Object.entries(cases.skills)) {
    const file = join(SKILLS_DIR, name, 'SKILL.md')
    if (!existsSync(file)) {
      await t.test(name, { skip: `no ${name}/SKILL.md in ${SKILLS_DIR}` }, () => {})
      continue
    }
    await t.test(name, () => {
      // Templates start with an HTML header comment before the frontmatter; real skills do not.
      const text = readFileSync(file, 'utf8').replace(/^\s*<!--[\s\S]*?-->\s*/, '')
      const description = (parseFrontmatter(text)?.description ?? '').toLowerCase()
      for (const phrase of [...triggers, ...skipFor]) {
        assert.ok(description.includes(phrase.toLowerCase()), `${name} description should mention "${phrase}"`)
      }
    })
  }
})
