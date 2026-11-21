// Zero-dependency tests. Run: node --test automations/
import test from "node:test"
import assert from "node:assert/strict"
import { compareVersions, newestEligible, normalizeTag, parseSource } from "./check-vendored.mjs"

test("normalizes release tags", () => {
  for (const t of ["v1.2.3", "V1.2.3", "release-1.2.3", "pkg@1.2.3", "pkg/v1.2.3"]) assert.equal(normalizeTag(t), "1.2.3")
  assert.equal(normalizeTag("1.2.3-rc.1"), null)
  assert.equal(normalizeTag("nightly"), null)
})

test("parses Source lines in several decorations", () => {
  assert.deepEqual(parseSource("Source: github:acme/skills@1.4.0"), { kind: "github", name: "acme/skills", version: "1.4.0" })
  assert.deepEqual(parseSource("<!-- Source: npm:left-pad@v2.0.1 -->"), { kind: "npm", name: "left-pad", version: "2.0.1" })
  assert.deepEqual(parseSource("- **Source:** `acme/skills@1.0.0`"), { kind: "github", name: "acme/skills", version: "1.0.0" })
  assert.equal(parseSource("no pin here"), null)
})

test("never offers a release younger than the min age, nor a prerelease", () => {
  const now = Date.parse("2026-01-10T00:00:00Z")
  const r = [
    { version: "1.0.0", publishedAt: "2025-12-01T00:00:00Z" },
    { version: "1.1.0", publishedAt: "2026-01-08T00:00:00Z" }, // 2 days old
    { version: "1.2.0-rc.1", publishedAt: "2025-12-02T00:00:00Z" },
  ]
  assert.equal(newestEligible(r, now, 5), "1.0.0")
  assert.equal(newestEligible([r[1]], now, 5), null)
})

test("compares versions numerically", () => {
  assert.ok(compareVersions("1.10.0", "1.9.0") > 0)
  assert.equal(compareVersions("1.0", "1.0.0"), 0)
})
