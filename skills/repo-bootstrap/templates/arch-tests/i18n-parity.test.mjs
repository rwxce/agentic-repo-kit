// Zero-dependency test for i18n-parity.mjs. Run: node --test arch-tests/
import test from "node:test"
import assert from "node:assert/strict"
import { collectKeys, compareKeys } from "./i18n-parity.mjs"

test("collects nested keys with dotted paths", () => {
  assert.deepEqual([...collectKeys({ a: { b: "x", c: { d: "y" } }, e: "z" })].sort(), ["a.b", "a.c.d", "e"])
})

test("reports missing and extra keys", () => {
  const r = compareKeys(collectKeys({ a: "1", b: "2" }), collectKeys({ a: "1", c: "3" }))
  assert.deepEqual(r, { missing: ["b"], extra: ["c"] })
})

test("treats arrays as leaves", () => {
  assert.deepEqual([...collectKeys({ list: ["a", "b"] })], ["list"])
})
