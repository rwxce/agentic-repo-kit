#!/usr/bin/env node
/**
 * CLI (not wired as a hook) — independent-review seal.
 *
 * Records that a fresh-context review (`/pr-review` or the diff-reviewer agent in a new
 * subagent, never the session that wrote the code) ran on the exact diff the branch carries.
 * The PR-creation command and the advisory PR preflight warn when a flow-sensitive diff has no
 * seal or the diff changed since the review. Only a review of `Type: independent` writes it.
 *
 *   node scripts/review-seal.mjs check [base]        exit 0 fresh, 1 stale/missing, 2 error
 *   node scripts/review-seal.mjs fingerprint [base]  reviewer, at start: write the exact diff the
 *       fingerprint covers to <REVIEW_SEAL_DIR>/<branch>.diff and print the fingerprint and that
 *       path. The sealing review reads that file — not origin/<base>..origin/<head>, which misses
 *       unpushed and uncommitted work — so what is reviewed is what gets sealed and pushed.
 *   node scripts/review-seal.mjs write [base] --expect <fingerprint>
 *       record the diff, refusing (exit 1) if it changed since `fingerprint` ran — so edits made
 *       while the review was running are never sealed as reviewed.
 *
 * Run it from the author's worktree (cd there first): a reviewer working in another checkout
 * would otherwise seal its own tree.
 *
 * Same fingerprint as pr-precheck-seal.mjs (imported, not copied): working tree vs the
 * merge-base with origin/<base>, default CONFIG.defaultBase of pr-precheck-seal.mjs. Stored in
 * .context/pr-review/ (gitignored).
 */

import { execFileSync } from "node:child_process"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import {
  CONFIG,
  computeFingerprint,
  fingerprintOf,
  sealFileName,
  withWorkingTreeSnapshot,
} from "./pr-precheck-seal.mjs"

/** Seal directory, relative to the repo root. Must be gitignored. */
export const REVIEW_SEAL_DIR = ".context/pr-review"

export function sealPath(root, branch) {
  return join(root, REVIEW_SEAL_DIR, sealFileName(branch))
}

export function reviewDiffPath(root, branch) {
  return sealPath(root, branch).replace(/\.sha$/, ".diff")
}

/**
 * One snapshot for both, so the saved diff is exactly what the fingerprint covers:
 * merge-base → working tree, untracked non-ignored files included.
 */
export function snapshotForReview(root, branch, base = CONFIG.defaultBase) {
  const { fingerprint, diff } = withWorkingTreeSnapshot(root, base, (snap) => ({
    fingerprint: fingerprintOf(snap),
    // Pinned flags: a reviewer's git config (color, external diff, textconv, prefixes) must not
    // change what the file shows relative to the bytes the fingerprint covers.
    diff: snap.git([
      "diff", "--no-renames", "--no-color", "--no-ext-diff", "--no-textconv",
      "--src-prefix=a/", "--dst-prefix=b/", snap.mergeBase, snap.tree,
    ]),
  }))
  const file = reviewDiffPath(root, branch)
  mkdirSync(join(root, REVIEW_SEAL_DIR), { recursive: true })
  writeFileSync(file, `${diff}\n`)
  return { fingerprint, file }
}

/** "fresh" | "stale" | "missing" for the current diff of `root`. */
export function reviewSealStatus(root, branch, base = CONFIG.defaultBase) {
  const value = computeFingerprint(root, base)
  let stored = ""
  try {
    stored = readFileSync(sealPath(root, branch), "utf8").trim()
  } catch {}
  if (!stored) return "missing"
  return stored === value ? "fresh" : "stale"
}

/** Thrown when the seal must not be written: no --expect, or the diff moved under the review. */
export class ReviewSealDriftError extends Error {}

export function writeReviewSeal(root, branch, base = CONFIG.defaultBase, expected) {
  if (!expected) {
    throw new ReviewSealDriftError("--expect <fingerprint> is required (run `fingerprint` before reviewing)")
  }
  const value = computeFingerprint(root, base)
  if (value !== expected) {
    throw new ReviewSealDriftError("the diff changed since the review started: review the new diff, then write again")
  }
  const file = sealPath(root, branch)
  mkdirSync(join(root, REVIEW_SEAL_DIR), { recursive: true })
  writeFileSync(file, `${value}\n`)
  return file
}

function run() {
  const args = process.argv.slice(2)
  const expectAt = args.indexOf("--expect")
  const expected = expectAt >= 0 ? args[expectAt + 1] : undefined
  if (expectAt >= 0) args.splice(expectAt, 2)
  const [mode, base = CONFIG.defaultBase] = args
  if (!["check", "write", "fingerprint"].includes(mode)) {
    console.error("usage: review-seal.mjs <check|fingerprint|write --expect <fp>> [base]")
    process.exit(2)
  }
  let root, branch
  try {
    const git = (cwd, gitArgs) =>
      execFileSync("git", gitArgs, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim()
    root = git(process.cwd(), ["rev-parse", "--show-toplevel"])
    branch = git(root, ["branch", "--show-current"])
    if (mode === "fingerprint") {
      const { fingerprint, file } = snapshotForReview(root, branch, base)
      console.log(`fingerprint: ${fingerprint}`)
      console.log(`diff: ${file}`)
      console.log(`Review this diff file (not the remote PR refs), then: write ${base} --expect ${fingerprint}`)
      return
    }
    if (mode === "write") {
      try {
        writeReviewSeal(root, branch, base, expected)
      } catch (error) {
        if (!(error instanceof ReviewSealDriftError)) throw error
        console.error(`review-seal: ${error.message}`)
        process.exit(1)
      }
      console.log(`independent-review seal written for ${branch}`)
      return
    }
    const status = reviewSealStatus(root, branch, base)
    if (status === "fresh") {
      console.log(`independent-review seal fresh for ${branch}: the diff is unchanged since the review`)
      return
    }
    console.log(
      `independent-review seal ${status} for ${branch}: run /pr-review in a fresh context on this diff`,
    )
    process.exit(1)
  } catch (error) {
    console.error(`review-seal: ${error.stderr?.toString().trim() || error.message}`)
    process.exit(2)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run()
