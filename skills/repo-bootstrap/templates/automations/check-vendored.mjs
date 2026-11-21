#!/usr/bin/env node
/**
 * WHAT: Freshness check for vendored third-party content (skills, prompts, rules copied into the
 * repo). Each vendored item must carry a pinned `Source: <spec>@<version>` line; the script
 * reports newer upstream releases, considering only releases at least MIN_AGE_DAYS old (so a
 * compromised or yanked-in-a-day release is never suggested). Read-only; advisory (exit 0) unless
 * --strict, which exits 1 when an item is unpinned or has an update available.
 * REPO SIGNAL: a directory of copied/installed skills or rules (.agents/skills, .rulesync/skills,
 * vendor/) with a lock file that records hashes but not versions.
 * CONFIGURE: VENDORED_DIRS (comma list, env or below), ENTRY_FILE, LOCK_FILE, MIN_AGE_DAYS.
 *   Spec forms: npm:<pkg> | pypi:<pkg> | github:<owner>/<repo> (bare owner/repo = github, bare
 *   name = npm). Example line in SKILL.md:   Source: github:acme/skills@1.4.0
 * Sources: `npm view <pkg> time --json`, PyPI JSON API, GitHub releases via `gh api` (GET only).
 * Usage: node scripts/check-vendored.mjs [--strict]   ("check:vendored" in package.json)
 */
import { execFileSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

export const CONFIG = {
  dirs: (process.env.VENDORED_DIRS ?? "<.agents/skills>").split(","),
  entryFile: process.env.VENDORED_ENTRY ?? "SKILL.md",
  lockFile: process.env.VENDORED_LOCK ?? "<skills-lock.json>", // optional; { skills: { name: { source, sourceType } } }
  minAgeDays: Number(process.env.MIN_AGE_DAYS ?? 5),
}
const DAY = 86_400_000

/** `v1.2.3`, `release-1.2.3`, `pkg@1.2.3`, `pkg/v1.2.3` -> `1.2.3`. Null for non-plain versions (rc, nightly). */
export function normalizeTag(tag) {
  const m = String(tag).trim().match(/^(?:.*[@/_-])?[vV]?(\d+(?:\.\d+)*)$/)
  return m ? m[1] : null
}

/** Parse `Source: spec@version` from a markdown body. Tolerates list/quote/comment/bold decoration. */
export function parseSource(text) {
  const m = text.match(/^[\s>*\-#]*(?:<!--\s*)?\**Source:?\**\s+`?([^\s`]+)@([^\s`@]+?)`?(?:\s*-->)?\s*$/im)
  if (!m) return null
  let [, spec, version] = m
  let kind = "npm"
  const prefixed = spec.match(/^(npm|pypi|github):(.+)$/)
  if (prefixed) [, kind, spec] = prefixed
  else if (spec.includes("/") && !spec.startsWith("@")) kind = "github"
  return { kind, name: spec, version: normalizeTag(version) ?? version }
}

const parts = (v) => v.replace(/^v/, "").split(/[.+-]/).map((p) => (/^\d+$/.test(p) ? Number(p) : 0))
export function compareVersions(a, b) {
  const x = parts(a), y = parts(b)
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0)
    if (d) return d
  }
  return 0
}

/** Newest stable release at least `minAgeDays` old, from [{ version, publishedAt }]; null if none. */
export function newestEligible(releases, now = Date.now(), minAgeDays = CONFIG.minAgeDays) {
  const ok = releases.filter(
    (r) => /^v?\d+(\.\d+)*$/.test(r.version) && now - new Date(r.publishedAt).getTime() >= minAgeDays * DAY,
  )
  if (!ok.length) return null
  return ok.reduce((best, r) => (compareVersions(r.version, best.version) > 0 ? r : best)).version.replace(/^v/, "")
}

const sh = (cmd, args) =>
  execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 })

async function fetchReleases({ kind, name }) {
  if (kind === "npm") {
    return Object.entries(JSON.parse(sh("npm", ["view", name, "time", "--json"])))
      .filter(([k]) => k !== "created" && k !== "modified")
      .map(([version, publishedAt]) => ({ version, publishedAt }))
  }
  if (kind === "pypi") {
    const res = await fetch(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`)
    if (!res.ok) throw new Error(`PyPI ${res.status}`)
    const data = await res.json()
    return Object.entries(data.releases ?? {})
      .filter(([, files]) => files.length > 0 && !files.every((f) => f.yanked))
      .map(([version, files]) => ({ version, publishedAt: files[0].upload_time_iso_8601 }))
  }
  // GET only: `gh api` without -f/-F/--method is a read. Drafts and prereleases are never offered.
  return JSON.parse(sh("gh", ["api", `repos/${name}/releases?per_page=30`]))
    .filter((r) => !r.draft && !r.prerelease)
    .map((r) => ({ version: normalizeTag(r.tag_name) ?? r.tag_name, publishedAt: r.published_at }))
}

function lockedOnly(documented) {
  if (!existsSync(CONFIG.lockFile)) return []
  try {
    const lock = JSON.parse(readFileSync(CONFIG.lockFile, "utf8"))
    return Object.entries(lock.skills ?? {})
      .filter(([name]) => !documented.has(name))
      .map(([name, v]) => ({ item: name, source: `${v.sourceType}:${v.source}` }))
  } catch {
    return []
  }
}

async function main() {
  const strict = process.argv.includes("--strict")
  const rows = []
  const documented = new Set()
  for (const root of CONFIG.dirs) {
    for (const item of existsSync(root) ? readdirSync(root) : []) {
      const file = join(root, item, CONFIG.entryFile)
      if (!existsSync(file)) continue
      const src = parseSource(readFileSync(file, "utf8"))
      if (!src) continue
      documented.add(item)
      try {
        const latest = newestEligible(await fetchReleases(src))
        const status = !latest ? "no eligible release" : compareVersions(latest, src.version) > 0 ? "UPDATE" : "up to date"
        rows.push({ item, source: `${src.kind}:${src.name}`, pinned: src.version, latest: latest ?? "-", status })
      } catch (err) {
        rows.push({ item, source: `${src.kind}:${src.name}`, pinned: src.version, latest: "-", status: `lookup failed (${err.message})` })
      }
    }
  }
  for (const u of lockedOnly(documented)) rows.push({ item: u.item, source: u.source, pinned: "-", latest: "-", status: "unpinned (add a Source: line)" })

  if (!rows.length) return console.log("[vendored] no `Source: <pkg>@<version>` lines found.")
  console.table(rows)
  const updates = rows.filter((r) => r.status === "UPDATE").length
  const unpinned = rows.filter((r) => r.status.startsWith("unpinned")).length
  console.log(`[vendored] ${updates} update(s), ${unpinned} unpinned (only releases >= ${CONFIG.minAgeDays} days old are considered).`)
  if (strict && (updates || unpinned)) process.exit(1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.log(`[vendored] failed: ${err.message}`) // advisory: a registry outage must not break CI
  })
}
