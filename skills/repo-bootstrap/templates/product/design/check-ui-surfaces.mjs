#!/usr/bin/env node
/**
 * WHAT: UI surfaces inventory guard (CI). Fails when a page file, or a source file that renders a
 *   floating surface (dialog, sheet, drawer, popover, menu…), is not cited in the inventory doc,
 *   and when a path cited in the inventory no longer exists.
 * REPO SIGNAL: `docs/ui-surfaces.md` (template `ui-surfaces.md`) next to a UI with pages and
 *   floating surfaces. Without the guard the inventory falls behind within weeks.
 * CONFIGURE: CONFIG.roots (where UI source lives), CONFIG.isPage (file-system routing convention),
 *   CONFIG.surfacePattern (the components your UI library uses for floating surfaces),
 *   CONFIG.ignore. Wire as `check:ui-surfaces` and run it in CI.
 * Usage: node scripts/check-ui-surfaces.mjs [inventoryFile]   exit 0 clean, 1 with problems
 * Zero dependencies. It reads source text, so a surface rendered through a wrapper with another
 * name is only caught if the wrapper's name is in the pattern.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

export const CONFIG = {
  inventory: process.env.UI_INVENTORY ?? 'docs/ui-surfaces.md',
  roots: ['app', 'src', 'components'],
  extensions: ['.tsx', '.jsx', '.vue', '.svelte'],
  /** Next.js App Router by default; e.g. `/\/pages\/.*\.vue$/` for Nuxt, `/Screen\.tsx$/` for RN. */
  isPage: (path) => /(^|\/)page\.(tsx|jsx)$/.test(path),
  /** JSX/template tags that open a floating surface. Add your wrappers' names. */
  surfacePattern: /<(Dialog|AlertDialog|Sheet|Drawer|Popover|DropdownMenu|ContextMenu|HoverCard|Toast|Modal)\b/,
  /** UI-library primitives themselves are not surfaces; list their folder. */
  ignore: [/(^|\/)components\/ui\//, /\.test\./, /\.stories\./, /(^|\/)node_modules\//],
}

const toPosix = (p) => p.split(sep).join('/')

export function walk(dir, cwd = process.cwd(), out = []) {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, cwd, out)
    else out.push(toPosix(relative(cwd, full)))
  }
  return out
}

/** Classifies source files into pages and surface files. `read` returns a file's text. */
export function classify(files, read, config = CONFIG) {
  const pages = []
  const surfaces = []
  for (const file of files) {
    if (!config.extensions.some((e) => file.endsWith(e))) continue
    if (config.ignore.some((re) => re.test(file))) continue
    if (config.isPage(file)) pages.push(file)
    else if (config.surfacePattern.test(read(file))) surfaces.push(file)
  }
  return { pages, surfaces }
}

/** Paths cited in backticks that look like files (have an extension and a slash). */
export function citedPaths(inventoryText) {
  const paths = new Set()
  for (const [, inner] of inventoryText.matchAll(/`([^`\s]+)`/g)) {
    if (/\/.+\.[a-z0-9]+$/i.test(inner) && !inner.includes('<')) paths.add(inner)
  }
  return paths
}

export function checkInventory({ pages, surfaces, inventoryText, exists }) {
  const cited = citedPaths(inventoryText)
  const problems = []
  for (const p of pages) if (!cited.has(p)) problems.push(`page not in inventory: ${p}`)
  for (const s of surfaces) if (!cited.has(s)) problems.push(`floating surface not in inventory: ${s}`)
  for (const c of cited) if (!exists(c)) problems.push(`inventory cites a missing file: ${c}`)
  return problems
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const inventory = process.argv[2] ?? CONFIG.inventory
  if (!existsSync(inventory)) {
    console.error(`UI surfaces guard: ${inventory} not found`)
    process.exit(1)
  }
  const files = CONFIG.roots.flatMap((r) => walk(r))
  const { pages, surfaces } = classify(files, (f) => readFileSync(f, 'utf8'))
  const problems = checkInventory({ pages, surfaces, inventoryText: readFileSync(inventory, 'utf8'), exists: existsSync })
  if (problems.length) {
    console.error(`UI surfaces guard failed (${inventory}):\n${problems.map((p) => `  • ${p}`).join('\n')}`)
    process.exit(1)
  }
  console.log(`UI surfaces guard passed (${pages.length} pages, ${surfaces.length} surface files).`)
}
