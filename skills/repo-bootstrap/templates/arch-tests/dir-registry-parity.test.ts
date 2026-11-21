/**
 * WHAT: Architecture test. Every directory under a "convention root" (pages, modules, feature
 * folders, API versions...) must be covered by a hand-maintained registry (an allow-list, a
 * protected-prefix list, a permissions table, a router mount list...).
 * REPO SIGNAL: a registry (array/Set/map of prefixes) that a human must edit when adding a
 * directory, plus a history of "forgot to add it to the list" bugs (an unprotected page, a module
 * never mounted, a feature without a permission entry).
 * CONFIGURE: the CONFIG block only. Delete the second `describe` if the registry cannot answer
 * "is this segment covered?" as a pure function.
 *
 * Runner: vitest shown. For jest replace the import with nothing (globals) and keep the rest.
 */
import { readdirSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// ---------------------------------------------------------------- CONFIG
// Import the registry's *public* predicate. It must be the same function production code uses,
// never a re-implementation: the test is only worth anything if it exercises the real lookup.
// import { isCovered } from "<path/to/registry-module>"
const isCovered = (_segment: string): boolean => {
  throw new Error("Wire CONFIG.isCovered to the real registry predicate")
}

const CONFIG = {
  /** Directory whose immediate children must all be registered, e.g. "app/(protected)". */
  conventionRoot: "<path/to/convention-root>",
  /** Children to skip. Private/underscore folders and route-group-like folders are not segments. */
  ignore: (name: string) => name.startsWith("_") || name.startsWith("."),
  /** Map a directory name to what the registry is asked about (add a locale prefix, a leading "/"). */
  toRegistryKey: (name: string) => `/${name}`,
  /** Recurse into these children (e.g. route groups "(group)") instead of treating them as segments. */
  isTransparentGroup: (name: string) => /^\(.*\)$/.test(name),
}
// ---------------------------------------------------------------- /CONFIG

function segmentsUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !CONFIG.ignore(e.name))
    .flatMap((e) =>
      CONFIG.isTransparentGroup(e.name) ? segmentsUnder(join(dir, e.name)) : [e.name],
    )
}

describe("directory <-> registry parity", () => {
  it("covers every directory under the convention root", () => {
    const segments = segmentsUnder(join(process.cwd(), CONFIG.conventionRoot))

    // Guard against a vacuous pass: a renamed root makes the loop below run zero times.
    expect(segments.length).toBeGreaterThan(0)

    for (const segment of segments) {
      // Second arg is the failure label: the failing assertion names the uncovered directory.
      expect(isCovered(CONFIG.toRegistryKey(segment)), `uncovered: ${segment}`).toBe(true)
    }
  })

  // Hard-won edge case: prefix registries are easy to write as `startsWith`, which also matches
  // `/dashboard-tips` for `/dashboard`. Pin the boundary so a loosened matcher fails here.
  it("does not match a sibling that merely shares a registered prefix", () => {
    const first = segmentsUnder(join(process.cwd(), CONFIG.conventionRoot))[0]
    if (!first) return
    expect(isCovered(CONFIG.toRegistryKey(`${first}-lookalike`))).toBe(false)
  })
})
