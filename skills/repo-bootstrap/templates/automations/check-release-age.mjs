#!/usr/bin/env node
/**
 * WHAT: Fails when the two dependency age gates disagree: Renovate's `minimumReleaseAge` (update
 *   PRs) and pnpm's `minimumReleaseAge` (every install). If Renovate waits less than pnpm, its PRs
 *   propose versions the install refuses (red CI on every bot PR); if pnpm waits less than Renovate,
 *   an agent's `pnpm add` pulls a release the bot would still be holding back. Also fails when either
 *   gate is missing or below the floor.
 * REPO SIGNAL: renovate.json5 (or renovate.json) and pnpm-workspace.yaml both in the repo.
 * CONFIGURE: CONFIG.files and CONFIG.minDays. Wire as `check:release-age` in CI.
 * Usage: node scripts/check-release-age.mjs    exit 0 aligned, 1 drift or missing
 */
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

export const CONFIG = {
  renovateFiles: ["renovate.json5", "renovate.json", ".github/renovate.json5", ".github/renovate.json"],
  pnpmFile: "pnpm-workspace.yaml",
  /** Floor for both gates, in days. */
  minDays: 3,
}

const UNIT_MINUTES = { minute: 1, hour: 60, day: 1440, week: 10080 }

/** Renovate's duration string ("5 days", "3d", "72 hours", "1 week") -> minutes, or null. */
export function renovateAgeMinutes(value) {
  const m = /^\s*(\d+(?:\.\d+)?)\s*(m|min|mins|minutes?|h|hrs?|hours?|d|days?|w|weeks?)\s*$/i.exec(String(value ?? ""))
  if (!m) return null
  const unit = m[2].toLowerCase()
  const key = unit.startsWith("mi") || unit === "m" ? "minute" : unit.startsWith("h") ? "hour" : unit.startsWith("d") ? "day" : "week"
  return Math.round(Number(m[1]) * UNIT_MINUTES[key])
}

/** The top-level `minimumReleaseAge` string of a renovate.json / json5 source, or null. */
export function readRenovateAge(source) {
  const m = /(?:^|[{,\s])["']?minimumReleaseAge["']?\s*:\s*["']([^"']+)["']/.exec(source)
  return m ? m[1] : null
}

/** pnpm-workspace.yaml `minimumReleaseAge: <minutes>` (top level, uncommented), or null. */
export function readPnpmAgeMinutes(source) {
  const m = /^minimumReleaseAge:\s*(\d+)\s*(?:#.*)?$/m.exec(source)
  return m ? Number(m[1]) : null
}

/** Problems for a pair of ages in minutes (null = gate missing). Empty = aligned. */
export function compareGates(renovateMinutes, pnpmMinutes, minDays = CONFIG.minDays) {
  const problems = []
  const floor = minDays * UNIT_MINUTES.day
  if (renovateMinutes === null) problems.push("Renovate has no parsable minimumReleaseAge")
  if (pnpmMinutes === null) problems.push("pnpm-workspace.yaml has no minimumReleaseAge")
  if (problems.length) return problems
  if (renovateMinutes < floor) problems.push(`Renovate minimumReleaseAge is ${renovateMinutes} min, below the ${minDays}-day floor`)
  if (pnpmMinutes < floor) problems.push(`pnpm minimumReleaseAge is ${pnpmMinutes} min, below the ${minDays}-day floor`)
  if (renovateMinutes !== pnpmMinutes) {
    problems.push(`the gates differ: Renovate waits ${renovateMinutes} min, pnpm ${pnpmMinutes} min. Set both to the same age.`)
  }
  return problems
}

function main() {
  const root = process.cwd()
  const renovateFile = CONFIG.renovateFiles.find((f) => existsSync(join(root, f)))
  const pnpmPath = join(root, CONFIG.pnpmFile)
  const renovate = renovateFile ? renovateAgeMinutes(readRenovateAge(readFileSync(join(root, renovateFile), "utf8"))) : null
  const pnpm = existsSync(pnpmPath) ? readPnpmAgeMinutes(readFileSync(pnpmPath, "utf8")) : null
  const problems = compareGates(renovate, pnpm)
  if (problems.length) {
    console.error(`Release-age gates out of line:\n- ${problems.join("\n- ")}`)
    process.exit(1)
  }
  console.log(`Release-age gates aligned (${renovate / UNIT_MINUTES.day} days).`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
