#!/usr/bin/env node
/**
 * Stop + PreCompact — advisory, always exits 0.
 *
 * Keeps `.context/handoff.md` current so a new chat (or the same session after a compaction)
 * can pick the work up without anyone pasting the plan. Pair it with load-handoff.mjs.
 *
 * Writes: branch, sha, working-tree status, diffstat, the active plan file and the last
 * "pending / what's left" block of the agent's latest message — read from the transcript
 * Claude Code passes in `transcript_path`, or taken directly from `last_assistant_text` and
 * `context_tokens` on hosts without a transcript file (a plugin for that host reads them from its
 * session API and pipes them in). Once per session, when the context passes
 * HANDOFF_CONTEXT_TOKENS (default 100k), it tells the user the hand off is ready.
 *
 * Optional: set HANDOFF_STATUS_CMD to a shell command and it runs after each write with
 * HANDOFF_STATUS (a one-line `branch@sha: first pending item`) and HANDOFF_FILE in its env —
 * e.g. to show the status on your ADE's worktree card. Its failures are ignored.
 *
 * The transcript format is internal and undocumented: every read is defensive. `.context/` is
 * gitignored workspace scratch shared by every chat of the same worktree.
 */

import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

// ---------------------------------------------------------------------------------------------
// CONFIG — edit for your repo
// ---------------------------------------------------------------------------------------------
export const DEFAULT_CONTEXT_THRESHOLD = 100_000
export const CONFIG = {
  /**
   * This repo's plan folder (see activePlan). Only the repo's: a per-user plans dir
   * (e.g. ~/.claude/plans) is shared by every project and workspace, so it would point the next
   * session at another repo's plan.
   */
  planDir: (root) => join(root, 'docs', 'plans'),
  planMaxAgeMs: 24 * 60 * 60 * 1000,
  pendingMaxChars: 2000,
  /** Words that open the "what's left" block of an agent message. Add your language's. */
  pendingWords: ["Pending for you", "What's left", "Next steps", "Open items"],
  /** Run after each write when set (see header). */
  statusCmdEnv: 'HANDOFF_STATUS_CMD',
}
// ---------------------------------------------------------------------------------------------

const PENDING_WORDS = CONFIG.pendingWords.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")
// Heading-shaped lines only (markdown heading, bold, or a line ending in a colon), so a sentence
// that merely starts with one of the words is not mistaken for the block.
const PENDING_HEADING = new RegExp(
  `^[ \\t]*(?:#{1,6}[ \\t]*(?:${PENDING_WORDS})\\b[^\\n]*|\\*\\*(?:${PENDING_WORDS})\\b[^\\n]*|(?:${PENDING_WORDS})\\b[^\\n]*:[ \\t]*)$`,
  "gim",
)

/** Last main-thread assistant text and context size from transcript JSONL lines. */
export function extractTranscriptState(lines) {
  let lastText = null
  let lastUsage = null
  for (const line of lines) {
    let entry
    try {
      entry = JSON.parse(line)
    } catch {
      continue
    }
    if (entry?.type !== "assistant" || !entry.message || entry.isSidechain) continue
    if (entry.message.usage) lastUsage = entry.message.usage
    const content = Array.isArray(entry.message.content) ? entry.message.content : []
    const text = content
      .filter((c) => c?.type === "text" && typeof c.text === "string")
      .map((c) => c.text)
      .join("\n")
    if (text.trim()) lastText = text
  }
  const contextTokens = lastUsage
    ? (lastUsage.input_tokens ?? 0) +
      (lastUsage.cache_read_input_tokens ?? 0) +
      (lastUsage.cache_creation_input_tokens ?? 0)
    : null
  return { lastText, contextTokens }
}

/** The pending block of the agent's message, or its tail when there is none. */
export function extractPending(text) {
  if (!text) return ""
  // The last heading wins: the pending block closes the agent's message.
  let last = null
  for (const match of text.matchAll(PENDING_HEADING)) last = match
  const block = last ? text.slice(last.index) : text.slice(-600)
  return block.trim().slice(0, CONFIG.pendingMaxChars)
}

/** Session state handed over directly by hosts that have no transcript file. */
export function stateFromInput(input) {
  return {
    lastText:
      typeof input?.last_assistant_text === "string" && input.last_assistant_text.trim() ? input.last_assistant_text : null,
    contextTokens: Number.isFinite(input?.context_tokens) ? input.context_tokens : null,
  }
}

export function shouldWarn({ contextTokens, threshold, alreadyWarned }) {
  return !alreadyWarned && typeof contextTokens === "number" && contextTokens >= threshold
}

export function renderHandoff({ branch, sha, status, diffstat, plan, pending, updated, event }) {
  return [
    "# Hand off",
    "",
    `branch: ${branch || "(detached)"}`,
    `sha: ${sha || "(none)"}`,
    `updated: ${updated}`,
    `event: ${event}`,
    `plan: ${plan || "(none found)"}`,
    "",
    "## Working tree",
    "```",
    status || "(clean)",
    "```",
    diffstat ? `\n${diffstat}` : "",
    "",
    "## Pending (from the last agent message)",
    "",
    pending || "(no pending block in the last message)",
    "",
    "Check the real tree before trusting this file: stale status is not proof that work or checks still apply.",
    "",
  ].join("\n")
}

/** Runs the optional status command with HANDOFF_STATUS / HANDOFF_FILE in its env; never throws. */
export function runStatusCommand(cmd, { status, file, cwd }) {
  if (!cmd || !cmd.trim()) return false
  try {
    execFileSync("sh", ["-c", cmd], {
      cwd,
      stdio: "ignore",
      timeout: 3000,
      env: { ...process.env, HANDOFF_STATUS: status, HANDOFF_FILE: file },
    })
    return true
  } catch {
    return false
  }
}

/** One-line status (for an ADE worktree card, a status bar...). */
export function statusLine({ branch, sha, pending }) {
  const first = (pending || "")
    .split("\n")
    .filter((l) => !new RegExp(PENDING_HEADING.source, "i").test(l))
    .map((l) => l.replace(/^[\s#*>-]+/, "").trim())
    .find(Boolean)
  return `${branch}@${sha}${first ? `: ${first}` : ""}`.slice(0, 120)
}

function git(root, args) {
  try {
    // trimEnd, not trim: `status --short` lines start with a meaningful space.
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trimEnd()
  } catch {
    return ""
  }
}

/**
 * The active plan under `dir`. Recency (last planMaxAgeMs) picks the initiative — the folder with
 * the most recently edited file — and inside it `plan.md` wins over whatever was touched last
 * (often `decisions.md` or a loop file), so the next session gets the roadmap and its invariants.
 * A loose file directly under `dir` competes as its own candidate.
 */
export function activePlan(dir, now = Date.now()) {
  const maxAge = CONFIG.planMaxAgeMs
  const newestIn = (current, depth) => {
    let best = null
    if (!existsSync(current)) return best
    for (const name of readdirSync(current)) {
      const path = join(current, name)
      try {
        const s = statSync(path)
        const hit = s.isDirectory()
          ? depth < 2
            ? newestIn(path, depth + 1)
            : null
          : now - s.mtimeMs > maxAge
            ? null
            : { path, mtimeMs: s.mtimeMs }
        if (hit && (!best || hit.mtimeMs > best.mtimeMs)) best = hit
      } catch {}
    }
    return best
  }

  let best = null
  if (!existsSync(dir)) return null
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    try {
      const s = statSync(path)
      let candidate = null
      if (s.isDirectory()) {
        const newest = newestIn(path, 1)
        if (newest) {
          const plan = join(path, "plan.md")
          candidate = { path: existsSync(plan) ? plan : newest.path, mtimeMs: newest.mtimeMs }
        }
      } else if (now - s.mtimeMs <= maxAge) {
        candidate = { path, mtimeMs: s.mtimeMs }
      }
      if (candidate && (!best || candidate.mtimeMs > best.mtimeMs)) best = candidate
    } catch {}
  }
  return best?.path ?? null
}

function run() {
  let input = {}
  try {
    input = JSON.parse(readFileSync(0, "utf8"))
  } catch {}

  // The cwd's checkout first, so a session inside a nested worktree writes that worktree's handoff.
  const root = git(process.cwd(), ["rev-parse", "--show-toplevel"]).trim() || process.env.CLAUDE_PROJECT_DIR
  if (!root) return

  const branch = git(root, ["branch", "--show-current"])
  const sha = git(root, ["rev-parse", "--short", "HEAD"])
  const status = git(root, ["status", "--short"]).split("\n").slice(0, 30).join("\n")
  const diffstat = git(root, ["diff", "--shortstat", "HEAD"]).trim()
  const plan = activePlan(CONFIG.planDir(root))

  let state = stateFromInput(input)
  if (typeof input.transcript_path === "string" && existsSync(input.transcript_path)) {
    try {
      state = extractTranscriptState(readFileSync(input.transcript_path, "utf8").split("\n"))
    } catch {}
  }
  const pending = extractPending(state.lastText)

  const contextDir = join(root, ".context")
  mkdirSync(contextDir, { recursive: true })
  const handoffFile = join(contextDir, "handoff.md")
  writeFileSync(
    handoffFile,
    renderHandoff({
      branch,
      sha,
      status,
      diffstat,
      plan,
      pending,
      updated: new Date().toISOString(),
      event: input.hook_event_name || "manual",
    }),
  )

  runStatusCommand(process.env[CONFIG.statusCmdEnv], { status: statusLine({ branch, sha, pending }), file: handoffFile, cwd: root })

  if (input.hook_event_name !== "Stop" || !input.session_id) return
  const threshold = Number(process.env.HANDOFF_CONTEXT_TOKENS) || DEFAULT_CONTEXT_THRESHOLD
  const stateDir = join(contextDir, "handoff-state")
  const flag = join(stateDir, String(input.session_id).replace(/[^A-Za-z0-9._-]/g, "_"))
  if (shouldWarn({ contextTokens: state.contextTokens, threshold, alreadyWarned: existsSync(flag) })) {
    mkdirSync(stateDir, { recursive: true })
    writeFileSync(flag, `${state.contextTokens}\n`)
    process.stdout.write(
      JSON.stringify({
        systemMessage: `Context at ~${Math.round(state.contextTokens / 1000)}k tokens. The hand off is written to .context/handoff.md — a new chat will pick it up.`,
      }),
    )
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    run()
  } catch {}
  process.exit(0)
}
