#!/usr/bin/env node
/**
 * SessionStart — advisory, always exits 0.
 *
 * Points a new chat (or a session right after a compaction) at
 * `.context/handoff.md`, written by save-handoff.mjs. Only when the hand off belongs to the
 * current branch and is under 24 h old; after a compaction, always. Prints nothing otherwise.
 * SessionStart stdout is added to the agent's context. Always exits 0.
 */

import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

/** A hand off older than this is ignored (except right after a compaction). */
export const MAX_AGE_MS = 24 * 60 * 60 * 1000

export function parseHandoffHeader(text) {
  const field = (name) => text.match(new RegExp(`^${name}: (.+)$`, "m"))?.[1]?.trim() ?? null
  return { branch: field("branch"), updated: field("updated") }
}

export function shouldLoad({ source, handoffBranch, currentBranch, ageMs }) {
  if (source === "compact") return true
  return Boolean(handoffBranch) && handoffBranch === currentBranch && ageMs >= 0 && ageMs < MAX_AGE_MS
}

export const LOAD_MESSAGE =
  "There is a hand off from the previous session: read `.context/handoff.md` (branch, sha, active plan, pending items) and check it against the real tree before continuing."

function run() {
  let input = {}
  try {
    input = JSON.parse(readFileSync(0, "utf8"))
  } catch {}

  const git = (args) =>
    execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim()
  let root = process.env.CLAUDE_PROJECT_DIR
  try {
    // The cwd's checkout first, so a session inside a nested worktree reads that worktree's handoff.
    root = git(["rev-parse", "--show-toplevel"]) || root
  } catch {}
  if (!root) return
  const file = join(root, ".context", "handoff.md")
  if (!existsSync(file)) return

  const { branch, updated } = parseHandoffHeader(readFileSync(file, "utf8"))
  const ageMs = updated ? Date.now() - Date.parse(updated) : Number.NaN
  let currentBranch = ""
  try {
    currentBranch = git(["-C", root, "branch", "--show-current"])
  } catch {}

  if (shouldLoad({ source: input.source, handoffBranch: branch, currentBranch, ageMs })) {
    console.log(LOAD_MESSAGE)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    run()
  } catch {}
  process.exit(0)
}
