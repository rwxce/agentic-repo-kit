#!/usr/bin/env node
/**
 * WHAT: Lists the "guard tests": tests that read the repo from disk (fs) instead of importing what
 *   they watch — e.g. a test walking the pages directory to check every route is registered, a UI
 *   inventory, skill and hook checks. Changed-only test runs (`vitest --changed`, `jest
 *   --changedSince`) follow the import graph, so they never select these tests when only the
 *   watched files change. CI runs this list on every PR on top of the changed set.
 * REPO SIGNAL: CI runs changed-only tests on PRs, and the repo has tests that read files from disk.
 * CONFIGURE: TEST_GLOBS for the repo's test file names. Copy to scripts/list-guard-tests.mjs.
 *
 * Prints one path per line. If it ever prints nothing, a test runner called with no filter runs
 * the whole suite: slower, never weaker.
 */
import { execFileSync } from "node:child_process"
import { pathToFileURL } from "node:url"

/** Test files to consider (git pathspecs). */
export const TEST_GLOBS = ["*.test.ts", "*.test.tsx", "*.test.js", "*.test.mjs"]

export const FS_READ_PATTERN = /\b(readdirSync|readFileSync|globSync|readdir|readFile)\b|from ["'](node:)?fs(\/promises)?["']/

/** Keeps the test files whose source reads the filesystem. */
export function selectGuardTests(files, readSource) {
  return files.filter((file) => FS_READ_PATTERN.test(readSource(file))).sort()
}

function main() {
  const files = execFileSync("git", ["ls-files", ...TEST_GLOBS], { encoding: "utf8" })
    .split("\n")
    .filter(Boolean)
  // Read from the index, so a CI checkout and a local run see the same content.
  const show = (file) => execFileSync("git", ["show", `:${file}`], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 })
  for (const file of selectGuardTests(files, show)) console.log(file)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
