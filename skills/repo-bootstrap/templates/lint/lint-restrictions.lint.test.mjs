/**
 * WHAT: Guard test that the repo's lint restrictions still fire. Lints small snippets through the
 *   repo's REAL ESLint config (ESLint's Node API, `lintText` with a virtual file path) and asserts
 *   that each forbidden import or call is reported in the scopes where it is forbidden, and still
 *   allowed where it is allowed (the gateway module that owns the SDK, for instance).
 *   Why a test: flat config does not merge `no-restricted-imports` (or `no-restricted-syntax`)
 *   across blocks. A later block matching the same files silently REPLACES the earlier list, a new
 *   `ignores` glob can exempt a whole directory, and a renamed folder can leave a `files` glob
 *   matching nothing. Lint keeps passing in every case; only a test that expects the error notices.
 * REPO SIGNAL: `no-restricted-imports` / `no-restricted-syntax` / custom rules acting as gateways
 *   (vendor SDKs only through their wrapper, data hooks only through the house hook, native deps
 *   only in workers), especially with more than one config block per file.
 * CONFIGURE: CASES below, one row per restriction: the snippet, the virtual paths where it must be
 *   reported (`fires`) and where it must not (`allowed`). Use paths in every scope the rule covers.
 *   Copy next to the eslint config (e.g. `lint/` or `scripts/`) under a name your test runner picks
 *   up. It reads config from disk, not through imports, so changed-only test runs never select it:
 *   add it to the guard-test list (ci/list-guard-tests.mjs) or run it on every PR.
 *   Requires `eslint` (>= 9) resolvable from the repo, and skips itself while CASES still hold
 *   `<placeholders>`.
 * Run: node --test lint/lint-restrictions.lint.test.mjs
 */
import assert from "node:assert/strict"
import { describe, it } from "node:test"

// ---------------------------------------------------------------------------------------------
// CONFIG — edit for your repo. Every value below is an EXAMPLE to replace.
// ---------------------------------------------------------------------------------------------
export const CASES = [
  {
    rule: "no-restricted-imports",
    code: 'import { track } from "<vendor-sdk>"',
    fires: ["<src>/components/example.tsx", "<src>/app/example.tsx"],
    allowed: ["<src/monitoring/analytics.ts>"], // the gateway that owns the SDK
  },
  {
    rule: "no-restricted-imports",
    code: 'import { useQuery } from "<data-client>/react"',
    fires: ["<src>/components/example.tsx"],
    allowed: ["<src/lib/use-app-query.ts>"], // the house hook wrapping it
  },
  // A named import that must stay allowed next to a restricted one from the same package:
  // { rule: "no-restricted-imports", code: 'import { useMutation } from "<data-client>/react"', fires: [], allowed: ["<src>/components/example.tsx"] },
]

/** Messages of `rule` only, so unrelated lint noise in a snippet never fails the case. */
export function messagesFor(result, rule) {
  return (result?.messages ?? []).filter((m) => m.ruleId === rule)
}

/** Every (case, path, expectation) triple, in a stable order, for one test each. */
export function expandCases(cases) {
  return cases.flatMap((c) => [
    ...(c.fires ?? []).map((filePath) => ({ ...c, filePath, expect: "fires" })),
    ...(c.allowed ?? []).map((filePath) => ({ ...c, filePath, expect: "allowed" })),
  ])
}

/** True while CASES still hold template placeholders such as `<vendor-sdk>`. */
export function hasPlaceholders(cases) {
  return cases.some((c) => /<[^>\s]+>/.test([c.code, ...(c.fires ?? []), ...(c.allowed ?? [])].join(" ")))
}

let ESLint
if (hasPlaceholders(CASES)) {
  it("CASES still hold <placeholders> -- fill them in; skipped", { skip: true }, () => {})
} else {
  try {
    ;({ ESLint } = await import("eslint"))
  } catch {
    it("eslint not installed -- skipped", { skip: true }, () => {})
  }
}

if (ESLint) {
  const eslint = new ESLint({ cwd: process.cwd() })

  describe("lint restrictions still fire", () => {
    for (const c of expandCases(CASES)) {
      it(`${c.rule} ${c.expect === "fires" ? "rejects" : "allows"} \`${c.code}\` in ${c.filePath}`, async () => {
        // An ignored path would make `allowed` pass vacuously and `fires` fail confusingly.
        assert.equal(await eslint.isPathIgnored(c.filePath), false, `${c.filePath} is ignored by the eslint config: pick a path the rule is meant to cover`)
        const [result] = await eslint.lintText(`${c.code}\n`, { filePath: c.filePath })
        const hits = messagesFor(result, c.rule)
        if (c.expect === "fires") {
          // Exactly one: two overlapping blocks reporting the same import means the config was
          // duplicated instead of merged, the next edit to one of them will drift.
          assert.equal(hits.length, 1, `${c.rule} should report once in ${c.filePath}, got ${hits.length}. A later config block may have replaced the list, or an ignores glob exempted this path.`)
        } else {
          assert.equal(hits.length, 0, `${c.rule} should not report in ${c.filePath}: ${hits.map((h) => h.message).join(" | ")}`)
        }
      })
    }
  })
}

describe("lint-restrictions: helpers", () => {
  it("expands fires and allowed paths into one case each", () => {
    const rows = expandCases([{ rule: "r", code: "x", fires: ["a.ts", "b.ts"], allowed: ["c.ts"] }])
    assert.deepEqual(rows.map((r) => [r.filePath, r.expect]), [["a.ts", "fires"], ["b.ts", "fires"], ["c.ts", "allowed"]])
  })

  it("detects unfilled placeholders", () => {
    assert.equal(hasPlaceholders([{ code: 'import x from "<vendor-sdk>"', fires: ["src/a.ts"] }]), true)
    assert.equal(hasPlaceholders([{ code: 'import x from "vendor-sdk"', fires: ["src/a.ts"], allowed: ["src/lib/gateway.ts"] }]), false)
  })

  it("keeps only the messages of the rule under test", () => {
    const result = { messages: [{ ruleId: "no-unused-vars" }, { ruleId: "no-restricted-imports" }, { ruleId: null }] }
    assert.equal(messagesFor(result, "no-restricted-imports").length, 1)
    assert.equal(messagesFor(undefined, "x").length, 0)
  })
})
