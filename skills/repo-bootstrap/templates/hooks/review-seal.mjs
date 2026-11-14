#!/usr/bin/env node
/**
 * CLI (not wired as a hook) — independent-review seal.
 *
 * Records that a fresh-context review (`/pr-review` or the diff-reviewer agent in a new
 * subagent, never the session that wrote the code) ran on the exact diff the branch carries.
 * The PR-creation command and the advisory PR preflight warn when a flow-sensitive diff has no
 * seal or the diff changed since the review. Only a review of `Type: independent` writes it.
 *
 *   node scripts/review-seal.mjs check [base]   exit 0 fresh, 1 stale/missing, 2 error
 *   node scripts/review-seal.mjs write [base]   record the current diff (the reviewer runs it)
 *
 * Same fingerprint as pr-precheck-seal.mjs (imported, not copied): working tree vs the
 * merge-base with origin/<base>, default CONFIG.defaultBase of pr-precheck-seal.mjs. Stored in
 * .context/pr-review/ (gitignored).
 */

import { execFileSync } from "node:child_process"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { CONFIG, computeFingerprint, sealFileName } from "./pr-precheck-seal.mjs"

/** Seal directory, relative to the repo root. Must be gitignored. */
export const REVIEW_SEAL_DIR = ".context/pr-review"

export function sealPath(root, branch) {
  return join(root, REVIEW_SEAL_DIR, sealFileName(branch))
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

export function writeReviewSeal(root, branch, base = CONFIG.defaultBase) {
  const file = sealPath(root, branch)
  mkdirSync(join(root, REVIEW_SEAL_DIR), { recursive: true })
  writeFileSync(file, `${computeFingerprint(root, base)}\n`)
  return file
}

function run() {
  const [mode, base = CONFIG.defaultBase] = process.argv.slice(2)
  if (mode !== "check" && mode !== "write") {
    console.error("usage: review-seal.mjs <check|write> [base]")
    process.exit(2)
  }
  let root, branch
  try {
    const git = (cwd, args) =>
      execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim()
    root = git(process.cwd(), ["rev-parse", "--show-toplevel"])
    branch = git(root, ["branch", "--show-current"])
    if (mode === "write") {
      writeReviewSeal(root, branch, base)
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
