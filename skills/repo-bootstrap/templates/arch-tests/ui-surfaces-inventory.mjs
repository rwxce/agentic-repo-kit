#!/usr/bin/env node
/**
 * WHAT: Keeps a UI surfaces inventory doc honest. Fails when (1) a page file is not cited in the
 *   doc, (2) a file that renders a floating surface (dialog, sheet, drawer, popover, menu, banner,
 *   portal) is not cited, or (3) the doc cites a file that no longer exists. The doc says how each
 *   surface behaves at each breakpoint and when it was last checked in the running app; this check
 *   makes "add the new surface to the inventory" impossible to forget, so responsive reviews and
 *   width sweeps start from a complete list.
 * REPO SIGNAL: a web app with many pages and overlays, responsive bugs found by users on a size
 *   nobody checked, or a design review that keeps asking "which screens does this touch?".
 *   Pair it with `registries/ui-surfaces.md` (the doc skeleton).
 * CONFIGURE: CONFIG below: the doc path, where pages live and how they are named, the directories
 *   to scan for overlays, the import/markup pattern that marks an overlay, and the primitives
 *   directory (the primitives themselves are not surfaces). Layout variants inside one page cannot
 *   be detected; the UI implementer's rules must require noting them in the doc in the same change.
 *   Wire as `check:ui-inventory` in CI. It reads files from disk: changed-only test runs never
 *   select it, so run it on every PR.
 * Usage: node scripts/ui-surfaces-inventory.mjs    exit 0 in sync, 1 with drift
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, sep } from "node:path"
import { pathToFileURL } from "node:url"

// ---------------------------------------------------------------------------------------------
// CONFIG — edit for your repo. Defaults model a file-system router (`app/**/page.tsx`) with a
// `components/ui/` primitives folder; every value is an example to adjust.
// ---------------------------------------------------------------------------------------------
export const CONFIG = {
  inventory: "docs/ui-surfaces.md",
  /** Where page files live and the file name that makes a route. */
  pagesDir: "app",
  pageFile: /(^|\/)page\.(tsx|jsx|ts|js|vue|svelte)$/,
  /** Directories scanned for files that render a floating surface. */
  scanDirs: ["app", "components", "src"],
  sourceFile: /\.(tsx|jsx|vue|svelte)$/,
  ignoreFile: /\.(test|spec|stories)\.[jt]sx?$/,
  /** The primitives folder: not surfaces by themselves. */
  primitivesDir: "components/ui/",
  /** An import of an overlay primitive, or markup that creates one by hand. */
  overlayPattern: /from ["'][^"']*\/ui\/(dialog|alert-dialog|sheet|drawer|popover|dropdown-menu|tooltip|toast)["']|role=["']dialog["']|createPortal/,
  /** Minimum counts, so a renamed directory cannot make the check pass with nothing found. */
  minPages: 1,
  minSurfaces: 0,
}

function walk(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap((name) => {
    if (name === "node_modules" || name.startsWith(".")) return []
    const full = join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

const toPosix = (p) => p.split(sep).join("/")

/** Every page file, repo-relative with forward slashes. */
export function findPages(root, config = CONFIG) {
  return walk(join(root, config.pagesDir))
    .map((f) => toPosix(relative(root, f)))
    .filter((f) => config.pageFile.test(f))
    .sort()
}

/** Every non-primitive source file that renders a floating surface. */
export function findFloatingSurfaces(root, config = CONFIG) {
  const files = new Set(config.scanDirs.flatMap((d) => walk(join(root, d))).map((f) => toPosix(relative(root, f))))
  return [...files]
    .filter((f) => config.sourceFile.test(f) && !config.ignoreFile.test(f))
    .filter((f) => !f.startsWith(config.primitivesDir))
    .filter((f) => config.overlayPattern.test(readFileSync(join(root, f), "utf8")))
    .sort()
}

/** Every repo path (with a directory and an extension) the doc cites inside backticks. */
export function citedPaths(doc) {
  return [...new Set([...doc.matchAll(/`([^`\s]+\/[^`\s]+\.[a-z]{1,6})`/g)].map((m) => m[1]))]
}

/** Drift between the code and the inventory doc. Empty arrays everywhere = in sync. */
export function checkInventory(root, config = CONFIG) {
  const docPath = join(root, config.inventory)
  if (!existsSync(docPath)) return { error: `${config.inventory} does not exist` }
  const doc = readFileSync(docPath, "utf8")
  const listed = (f) => doc.includes(`\`${f}\``)
  const pages = findPages(root, config)
  const surfaces = findFloatingSurfaces(root, config)
  const problems = []
  if (pages.length < config.minPages) problems.push(`found ${pages.length} page(s) under ${config.pagesDir}, expected at least ${config.minPages}: is CONFIG.pagesDir still right?`)
  if (surfaces.length < config.minSurfaces) problems.push(`found ${surfaces.length} floating surface(s), expected at least ${config.minSurfaces}: is CONFIG.overlayPattern still right?`)
  return {
    problems,
    unlistedPages: pages.filter((f) => !listed(f)),
    unlistedSurfaces: surfaces.filter((f) => !listed(f)),
    missing: citedPaths(doc).filter((f) => !existsSync(join(root, f))),
  }
}

function main() {
  const r = checkInventory(process.cwd())
  if (r.error) {
    console.error(`UI inventory: ${r.error}. Start from registries/ui-surfaces.md.`)
    process.exit(1)
  }
  const out = [
    ...r.problems,
    ...r.unlistedPages.map((f) => `page not in ${CONFIG.inventory}: ${f}`),
    ...r.unlistedSurfaces.map((f) => `floating surface not in ${CONFIG.inventory}: ${f}`),
    ...r.missing.map((f) => `${CONFIG.inventory} cites a file that no longer exists: ${f}`),
  ]
  if (out.length) {
    console.error(`UI inventory out of sync:\n- ${out.join("\n- ")}\nAdd each surface with its phone/tablet/desktop behaviour, or remove the stale row.`)
    process.exit(1)
  }
  console.log("UI inventory in sync.")
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
