/**
 * WHAT: Pure policy for routing a PR to a review lane: "demonstrable" (self-approve on evidence +
 * green CI) or "flow-sensitive" (independent review required). No I/O, so it is unit-testable and
 * safe to import from a trusted workflow.
 * REPO SIGNAL: reviews of uneven depth; a small team where not every PR needs a second human; agents
 * authoring PRs whose self-declared "this is trivial" cannot be trusted.
 * CONFIGURE: the CONFIG block (sensitive paths, author -> cross-reviewer map, labels).
 * INVARIANTS (the tests pin them; do not weaken):
 *   1. Any sensitive path forces flow-sensitive, regardless of what the author ticked.
 *   2. Missing or ambiguous lane selection (none, or both) fails closed to flow-sensitive.
 *   3. Unknown author (not in REVIEWERS) fails closed.
 *   4. Never downgrade: a PR already labelled human-required stays flow-sensitive.
 */

// ---------------------------------------------------------------- CONFIG
export const REVIEW_LABELS = {
  evidence: "review:evidence-approval",
  human: "review:human-required",
}

/** author login -> who cross-reviews them. Anyone absent is "unknown" and fails closed. */
const REVIEWERS = {
  "<author-1>": "<author-2>",
  "<author-2>": "<author-1>",
}

const EXACT_SENSITIVE_PATHS = new Set(["package.json", "<lockfile>", "<middleware-file>", "<routes-registry>"])

const SENSITIVE_PREFIXES = [
  ".github/",
  ".rulesync/",
  "<migrations-dir>/",
  "<src/api>/",
  "<src/auth>/",
  "<src/db>/",
  "<src/services>/",
  "<compliance-dir>/",
]

/** Case-insensitive substrings anywhere in the path (billing, payments, legal pages). */
const SENSITIVE_FRAGMENTS = ["/billing/", "<payment-provider>", "subscription", "/legal/"]
// ---------------------------------------------------------------- /CONFIG

export function reviewerFor(author) {
  return Object.hasOwn(REVIEWERS, author) ? REVIEWERS[author] : undefined
}

export function isSensitivePath(path) {
  const lower = path.toLowerCase()
  return (
    EXACT_SENSITIVE_PATHS.has(path) ||
    SENSITIVE_PREFIXES.some((p) => path.startsWith(p)) ||
    SENSITIVE_FRAGMENTS.some((f) => lower.includes(f.toLowerCase()))
  )
}

export function classifyReview({ author, body = "", paths = [], labels = [] }) {
  const demonstrable = (body.match(/- \[[xX]\] \*\*Demonstrable\*\*/g) ?? []).length
  const sensitive = (body.match(/- \[[xX]\] \*\*Flow-sensitive\*\*/g) ?? []).length
  const validDemonstrableSelection = demonstrable === 1 && sensitive === 0
  const sensitiveFiles = paths.filter(isSensitivePath)
  const wasEscalated = labels.includes(REVIEW_LABELS.human)
  const unknownAuthor = !reviewerFor(author)

  return {
    flowSensitive: wasEscalated || !validDemonstrableSelection || sensitiveFiles.length > 0 || unknownAuthor,
    sensitiveFiles,
  }
}
