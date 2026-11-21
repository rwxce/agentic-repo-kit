# Content module

Opt-in. Propose it only when the product has a public site with a blog, guides, comparison pages
or a user-facing changelog. A CLI, a library or an internal tool gets none of this (a library's
developer `CHANGELOG.md` is not this module).

| Piece | Lands as | Signal | What it prevents |
|---|---|---|---|
| `content-registry.ts` | `lib/content/registry.ts` (or split per kind) | content items listed in code or a CMS export | sitemap, index, static params and RSS disagreeing about what exists |
| `content-registry.test.mjs` | next to the registry | the registry | duplicate slugs, missing locale text, changelog out of order, vendor or incident words in public notes, **third-party facts older than the allowed age** |
| `../../skills/content-writing/` (+ `references/posts.md`, `comparison-pages.md`) | `.rulesync/skills/content-writing/` | blog or comparison pages | invented facts, unfair comparisons, pages that answer no reader question |
| `../../skills/changelog-entry/` | `.rulesync/skills/changelog-entry/` | a public "what's new" page | release notes that leak incidents, vendors or promises; entries missing for a release |
| `../../arch-tests/content-assets-exist.test.ts` (already in the kit) | next to the registry | covers, og images, per-locale bodies on disk | an item that ships while its image 404s |

**Dated facts.** Any page that states something about another company carries the date the facts
were last read on that company's public pages, shown on the page and checked by the test. When the
date passes the allowed age the build fails until someone re-reads the sources and bumps it.

**`llms.txt` is optional.** It is a community proposal (<https://llmstxt.org/>) some AI agents
read. Google Search does not need it: its guide to AI features says there are no additional
technical requirements beyond normal Search eligibility
(<https://developers.google.com/search/docs/appearance/ai-features>, read on 2026-11-21). If the repo
keeps one, generate it from the registry or list it in the test's `listing`, so it cannot drift.

**Related concept cards:** `route-registry`, `guard-tests`.

**Example (reference project, not a default):** blog posts, comparison pages and the changelog were
typed registries in code with text in the messages of every locale; the blog test checked every post
against `public/llms.txt`; the changelog test rejected vendor names and incident words in eight
languages.
