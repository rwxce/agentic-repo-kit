/**
 * WHAT: Architecture test. Every route declared in a central route registry (a `routes.ts` of
 * path builders, a sitemap list, a nav config) must resolve to a real page/handler file.
 * REPO SIGNAL: a single-source-of-truth routes module + review comments like "dead link" /
 * "page before linking to it". The same check exists as an ESLint rule (`registry-path-exists`
 * in ../lint) for editor feedback; keep this test as the CI backstop that also covers registries
 * the lint rule cannot parse (generated, computed).
 * CONFIGURE: CONFIG only. The default file-system model is Next.js-style (folders = segments,
 * `[param]` = dynamic, `(group)` = invisible). For other frameworks replace `collectPatterns`
 * (Express/Fastify: read the router table; Rails/Django: ask the framework to dump routes).
 */
import { readdirSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// ---------------------------------------------------------------- CONFIG
// import { routes } from "<path/to/routes-registry>"
// Return every registered route as a pattern; use `*` for each dynamic parameter.
// For builder functions call them with a sentinel: routes.item.path("__p__") -> "/items/__p__".
const registeredRoutes = (): string[] => {
  throw new Error("Wire CONFIG: return the registry's routes")
}

const CONFIG = {
  appRoot: "<path/to/pages-root>", // e.g. "app/[locale]"
  pageFiles: new Set(["page.tsx", "page.ts", "route.ts"]),
  sentinel: "__p__", // matches the placeholder used in registeredRoutes()
  // Routes not backed by a file in appRoot (API routes live elsewhere, external redirects...).
  skip: (route: string) => route.startsWith("/api/"),
  // Routes intentionally declared ahead of their page. Keep tiny and commented.
  declaredAhead: new Set<string>([]),
}
// ---------------------------------------------------------------- /CONFIG

const GROUP = /^\(.*\)$/ // (marketing) — invisible in URLs
const DYNAMIC = /^\[.*\]$/ // [id], [...slug], [[...slug]]

function collectPatterns(dir: string, segments: string[], out: Set<string>) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      collectPatterns(join(dir, entry.name), [...segments, entry.name], out)
    } else if (CONFIG.pageFiles.has(entry.name)) {
      const url = segments.filter((s) => !GROUP.test(s)).map((s) => (DYNAMIC.test(s) ? "*" : s))
      out.add(`/${url.join("/")}`.replace(/\/$/, "") || "/")
    }
  }
}

describe("route registry <-> pages", () => {
  const patterns = new Set<string>()
  collectPatterns(join(process.cwd(), CONFIG.appRoot), [], patterns)

  it("finds pages at all (guards against a wrong appRoot passing vacuously)", () => {
    expect(patterns.size).toBeGreaterThan(0)
  })

  it("resolves every registered route to a page file", () => {
    for (const raw of registeredRoutes()) {
      // Normalise the sentinel and any `${param}` residue to the same wildcard the scan uses.
      const route = raw.split(CONFIG.sentinel).join("*").replace(/\/$/, "") || "/"
      if (CONFIG.skip(route) || CONFIG.declaredAhead.has(route)) continue
      expect(patterns.has(route), `no page resolves "${route}"`).toBe(true)
    }
  })
})
