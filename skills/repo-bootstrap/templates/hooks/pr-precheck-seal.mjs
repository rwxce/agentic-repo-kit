#!/usr/bin/env node
/**
 * CLI (not wired as a hook) — precheck seal.
 *
 * Records that the pr-scope precheck (the "is this diff complete and inside its frozen scope?"
 * pass) already ran on the exact diff a branch carries, so the PR-creation and PR-triage
 * commands can skip a repeat run and re-run it as soon as anything changes.
 *
 *   node scripts/pr-precheck-seal.mjs check [base]   exit 0 fresh, 1 stale/missing, 2 error
 *   node scripts/pr-precheck-seal.mjs write [base]   record the current diff
 *
 * The fingerprint is the whole working tree (tracked, staged, and untracked
 * non-ignored files) snapshotted into a throwaway index, diffed against the
 * merge-base with origin/<base> (default CONFIG.defaultBase). Staging or committing the same
 * changes therefore keeps it fresh, and fetching a newer base does not
 * invalidate it. The seal lives in .context/ (gitignored workspace scratch),
 * which add -A skips like any ignored path, so writing the seal never changes it.
 */

import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"

// ---------------------------------------------------------------------------------------------
// CONFIG — edit for your repo
// ---------------------------------------------------------------------------------------------
export const CONFIG = {
  /** Branch PRs target when no base is passed (your default PR base). */
  defaultBase: "main",
  /** Seal directory, relative to the repo root. Must be gitignored. */
  sealDir: ".context/pr-precheck",
}
// ---------------------------------------------------------------------------------------------

function git(cwd, args, env) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    env: env ? { ...process.env, ...env } : process.env,
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  }).trim()
}

export function sealFileName(branch) {
  return `${(branch || "detached").replace(/[^A-Za-z0-9._-]/g, "__")}.sha`
}

/** Thrown when the base itself cannot be resolved — the only case a fetch can fix. */
class BaseError extends Error {}

export function computeFingerprint(root, base = CONFIG.defaultBase) {
  let mergeBase
  try {
    mergeBase = git(root, ["merge-base", `origin/${base}`, "HEAD"])
  } catch {
    throw new BaseError(`cannot find a merge-base with origin/${base}`)
  }

  // Snapshot the working tree without touching the real index.
  const scratch = mkdtempSync(join(tmpdir(), "pr-precheck-seal-"))
  try {
    const index = join(scratch, "index")
    const realIndex = resolve(root, git(root, ["rev-parse", "--git-path", "index"]))
    if (existsSync(realIndex)) copyFileSync(realIndex, index)
    const env = { GIT_INDEX_FILE: index }
    // .context/ is gitignored, so add -A leaves the seal out. An explicit exclude pathspec
    // would make git refuse ("paths are ignored") whenever .context/ exists.
    git(root, ["add", "-A", "--", "."], env)
    const tree = git(root, ["write-tree"], env)
    // Blob ids per changed path: content-addressed, and small even for large binaries.
    const changes = git(root, ["diff-tree", "-r", "--no-renames", mergeBase, tree])
    return createHash("sha256").update(changes).digest("hex")
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
}

function run() {
  const [mode, base = CONFIG.defaultBase] = process.argv.slice(2)
  if (mode !== "check" && mode !== "write") {
    console.error("usage: pr-precheck-seal.mjs <check|write> [base]")
    process.exit(2)
  }

  let root, branch, value
  try {
    root = git(process.cwd(), ["rev-parse", "--show-toplevel"])
    branch = git(root, ["branch", "--show-current"])
    value = computeFingerprint(root, base)
  } catch (error) {
    const hint = error instanceof BaseError ? ` (run git fetch origin ${base})` : ""
    const detail = error.stderr?.toString().trim() || error.message
    console.error(`pr-precheck-seal: ${detail}${hint}`)
    process.exit(2)
  }

  const dir = join(root, CONFIG.sealDir)
  const file = join(dir, sealFileName(branch))

  if (mode === "write") {
    mkdirSync(dir, { recursive: true })
    writeFileSync(file, `${value}\n`)
    console.log(`precheck seal written for ${branch}`)
    return
  }

  let stored = ""
  try {
    stored = readFileSync(file, "utf8").trim()
  } catch {}
  if (stored === value) {
    console.log(`precheck seal fresh for ${branch}: diff unchanged since the last precheck`)
    return
  }
  console.log(`precheck seal ${stored ? "stale" : "missing"} for ${branch}: run the pr-scope precheck`)
  process.exit(1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run()
