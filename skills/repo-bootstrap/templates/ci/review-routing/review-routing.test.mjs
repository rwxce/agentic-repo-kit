// Zero-dependency tests for the routing invariants. Run: node --test ci/review-routing/
// The CONFIG placeholders in review-routing.mjs must be filled first; the tests read them via the
// public API, so use whatever real author/path values you configured (edit the constants below).
import test from "node:test"
import assert from "node:assert/strict"
import { classifyReview, isSensitivePath, reviewerFor, REVIEW_LABELS } from "./review-routing.mjs"

const KNOWN = "<author-1>" // a key of REVIEWERS
const SENSITIVE = ".github/workflows/ci.yml" // matches a configured prefix
const SAFE = "src/ui/button.tsx" // matches nothing

const demonstrable = `
## Review lane
- [x] **Demonstrable** — fast approval.
- [ ] **Flow-sensitive** — another reviewer must approve.
`

test("keeps a plain change in the evidence lane", () => {
  assert.deepEqual(classifyReview({ author: KNOWN, body: demonstrable, paths: [SAFE] }), {
    flowSensitive: false,
    sensitiveFiles: [],
  })
})

test("escalates when any file is sensitive, even if the author ticked Demonstrable", () => {
  assert.equal(isSensitivePath(SENSITIVE), true)
  const r = classifyReview({ author: KNOWN, body: demonstrable, paths: [SAFE, SENSITIVE] })
  assert.equal(r.flowSensitive, true)
  assert.deepEqual(r.sensitiveFiles, [SENSITIVE])
})

test("fails closed for missing or ambiguous lane selection", () => {
  for (const body of ["", `${demonstrable}\n- [x] **Flow-sensitive**`]) {
    assert.equal(classifyReview({ author: KNOWN, body, paths: [SAFE] }).flowSensitive, true)
  }
})

test("fails closed for an unknown author", () => {
  assert.equal(classifyReview({ author: "external-user", body: demonstrable, paths: [] }).flowSensitive, true)
})

test("does not treat Object.prototype keys as known authors", () => {
  assert.equal(reviewerFor("constructor"), undefined)
  assert.equal(classifyReview({ author: "toString", body: demonstrable, paths: [] }).flowSensitive, true)
})

test("never downgrades a PR that was already escalated", () => {
  const r = classifyReview({ author: KNOWN, body: demonstrable, paths: [], labels: [REVIEW_LABELS.human] })
  assert.equal(r.flowSensitive, true)
})
