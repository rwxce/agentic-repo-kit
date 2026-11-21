/**
 * WHAT: Architecture test. A registry of stable string codes (error codes, event names, feature
 * flags, permission keys, analytics events) is globally unique, well-formed, and every consumer
 * helper recognises every code.
 * REPO SIGNAL: `as const` objects grouped per domain whose values are sent to a third party
 * (monitoring, analytics) or persisted. Two groups defining the same value silently merge two
 * different failures in dashboards; a typo'd casing splits one.
 * CONFIGURE: CONFIG only.
 */
import { describe, expect, it } from "vitest"

// ---------------------------------------------------------------- CONFIG
// import * as Codes from "<path/to/codes-module>"
// Groups: { GroupName: { key: "VALUE" } }. If the module also exports helpers, pass only the groups.
const groups: Record<string, Record<string, string>> = {}
const CONFIG = {
  format: /^[A-Z][A-Z0-9_]*$/, // e.g. SCREAMING_SNAKE; use /^[a-z]+(\.[a-z_]+)*$/ for event names
  /** Optional predicate the production code uses to recognise a code (e.g. isKnownCode). */
  isKnown: undefined as undefined | ((value: string) => boolean),
}
// ---------------------------------------------------------------- /CONFIG

const entries = Object.entries(groups).flatMap(([group, codes]) =>
  Object.entries(codes).map(([key, value]) => ({ group, key, value })),
)

describe("code registry", () => {
  it("is not empty", () => expect(entries.length).toBeGreaterThan(0))

  it("has no duplicate values across groups", () => {
    const seen = new Map<string, string>()
    const dupes: string[] = []
    for (const { group, key, value } of entries) {
      const where = `${group}.${key}`
      const prev = seen.get(value)
      if (prev) dupes.push(`${value}: ${prev} and ${where}`)
      else seen.set(value, where)
    }
    expect(dupes).toEqual([])
  })

  it("matches the agreed format", () => {
    const bad = entries.filter((e) => !CONFIG.format.test(e.value)).map((e) => `${e.group}.${e.key}=${e.value}`)
    expect(bad).toEqual([])
  })

  it.skipIf(!CONFIG.isKnown)("is recognised by the production predicate", () => {
    const unknown = entries.filter((e) => !CONFIG.isKnown!(e.value)).map((e) => e.value)
    expect(unknown).toEqual([])
    expect(CONFIG.isKnown!("NOT_A_REAL_CODE")).toBe(false)
  })
})
