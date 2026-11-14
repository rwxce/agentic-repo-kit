#!/usr/bin/env node
/**
 * WHAT: Fails when packages that must move together are pinned to different versions (an SDK and
 *   its CLI, a framework and its plugins). Reads package.json (dependencies + devDependencies) and
 *   the top-level `overrides:` of pnpm-workspace.yaml (or package.json `overrides`).
 * REPO SIGNAL: an update bot groups these families for normal updates, but its security PRs go
 *   out one package at a time, so a lone bump leaves the sibling behind and breaks a deploy or a
 *   build step that requires both to match.
 * CONFIGURE: CONFIG.families. Wire as `check:deps` in package.json and run it in CI.
 * Usage: node scripts/check-dependency-families.mjs     exit 0 aligned, 1 mismatched
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const CONFIG = {
  /** Neutral examples: replace with the families your repo actually pins together. */
  families: [
    { name: '<sdk>', packages: ['<sdk-cli>', '@<scope>/sdk', '@<scope>/build', '@<scope>/core'] },
    { name: 'Example: TanStack Query', packages: ['@tanstack/react-query', '@tanstack/react-query-devtools'] },
  ],
  workspaceFile: 'pnpm-workspace.yaml',
}

/** Top-level `overrides:` entries of a pnpm-workspace.yaml as { name: version }. */
export function parseOverrides(yaml) {
  const overrides = {}
  let inBlock = false
  for (const line of yaml.split('\n')) {
    if (/^overrides:\s*$/.test(line)) {
      inBlock = true
      continue
    }
    if (!inBlock) continue
    if (/^\S/.test(line)) break
    const match = /^ {2}'?([^':\s][^':]*?)'?:\s*'?([^'\s#]+)'?/.exec(line)
    if (match) overrides[match[1]] = match[2]
  }
  return overrides
}

/** Each family whose present packages do not all share one version, with the versions found. */
export function findMismatches(packageJson, overrides, families = CONFIG.families) {
  const declared = { ...packageJson.dependencies, ...packageJson.devDependencies, ...packageJson.overrides, ...overrides }
  return families.flatMap((family) => {
    const found = family.packages.filter((p) => declared[p] !== undefined).map((p) => ({ name: p, version: declared[p] }))
    return new Set(found.map((f) => f.version)).size > 1 ? [{ family: family.name, found }] : []
  })
}

function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..')
  const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  const ws = join(root, CONFIG.workspaceFile)
  const overrides = existsSync(ws) ? parseOverrides(readFileSync(ws, 'utf8')) : {}
  const mismatches = findMismatches(packageJson, overrides)
  if (mismatches.length === 0) {
    console.log(`Dependency families aligned (${CONFIG.families.map((f) => f.name).join(', ')}).`)
    return
  }
  for (const m of mismatches) {
    console.error(`${m.family} packages must share one version: ${m.found.map((f) => `${f.name}@${f.version}`).join(', ')}`)
  }
  process.exit(1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
