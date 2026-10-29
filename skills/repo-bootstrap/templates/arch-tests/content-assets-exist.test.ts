/**
 * WHAT: Architecture test. A content index (blog posts, docs pages, changelog, product catalogue)
 * must agree with the file system: slugs/keys unique, every referenced asset (cover, og image,
 * body file, per-locale file) exists on disk, and every locale has its text.
 * REPO SIGNAL: a TypeScript/JSON array that lists content items AND files that live elsewhere
 * (public/, content/, per-locale bodies). Typical bug: the item ships, the image 404s.
 * CONFIGURE: CONFIG only; delete checks that do not apply.
 */
import { existsSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// ---------------------------------------------------------------- CONFIG
type Item = {
  slug: string
  key?: string
  assets: string[] // public-relative or repo-relative paths to verify
  texts?: Record<string, { title?: string; description?: string } | undefined>
}
// import { items } from "<path/to/content-index>"
const items: Item[] = []
const CONFIG = {
  /** Where `assets` paths are rooted ("public" for web assets, "." for repo-relative). */
  assetRoot: "public",
  locales: ["en"],
  /** Optional: a file that must list every item (llms.txt, sitemap.xml, RSS). */
  listing: undefined as undefined | { file: string; entryFor: (i: Item) => string },
}
// ---------------------------------------------------------------- /CONFIG

describe("content index <-> file system", () => {
  it("is not empty (guards against a wrong import passing vacuously)", () => {
    expect(items.length).toBeGreaterThan(0)
  })

  it("uses unique slugs and keys", () => {
    const slugs = items.map((i) => i.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    const keys = items.map((i) => i.key).filter(Boolean)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it("has a title and description in every locale", () => {
    for (const item of items)
      for (const locale of CONFIG.locales) {
        const t = item.texts?.[locale]
        expect(t?.title, `${item.slug}/${locale} title`).toBeTruthy()
        expect(t?.description, `${item.slug}/${locale} description`).toBeTruthy()
      }
  })

  it("has every referenced asset on disk", () => {
    for (const item of items)
      for (const asset of item.assets)
        expect(existsSync(join(process.cwd(), CONFIG.assetRoot, asset)), `${item.slug}: ${asset}`).toBe(true)
  })

  it.skipIf(!CONFIG.listing)("is listed in the public index (sitemap/llms/RSS)", async () => {
    const { readFileSync } = await import("node:fs")
    const text = readFileSync(join(process.cwd(), CONFIG.listing!.file), "utf8")
    for (const item of items) expect(text, item.slug).toContain(CONFIG.listing!.entryFor(item))
  })
})
