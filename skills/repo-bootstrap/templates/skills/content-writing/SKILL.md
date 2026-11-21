<!--
TEMPLATE: content-writing skill (content module). Generate it when the product site has a blog,
guides or comparison ("vs") pages. Fill: <registry path>, <messages dir>, <locales>, <author>,
<positioning/tone docs>, <SEO metadata builder>. Strip this comment.
-->
---
name: content-writing
description: >-
  Write or update a blog post, guide or comparison ("vs") page for the product site: pick the
  reader's question, check every third-party fact on its public source, write in the project's
  positioning and tone, register the item in the typed content registry with its dates, add the
  text in every locale, and run the content guard. Use when the user asks for a new post, an
  article, a guide, a comparison or alternative page, or to refresh one whose facts went stale.
targets: ["*"]
---

# Content writing

Content here is product surface, not filler: every page answers one question a real reader has,
and every claim about another company is checked and dated. Read `<positioning doc>` and
`<tone doc>` first; they decide what the page may say and how it sounds.

## 1. Pick the question

- Write down the reader and the sentence they would type ("how do I…", "<tool> alternative",
  "<tool> vs <tool>"). One page, one question. If an existing page already answers it, update that
  page instead of writing a second one.
- Say which doubt from `<positioning doc>` the page answers. A page that answers none is not
  written.

## 2. Gather facts

- Every statement about a third-party tool, price, policy or platform rule is read on that party's
  public page **in this session** (scraper or browser), with the URL kept in the draft.
- Facts about our own product come from the code and config (plans, limits, features), never from
  memory or an older page.
- Opinions of users about a competitor are summarised faithfully with a link to the source, never
  quoted as if they were ours, and never taken from reviews written by competitors.

## 3. Write

- Follow `references/posts.md` (posts and guides) or `references/comparison-pages.md` (vs pages).
- Present tense for what exists; nothing in the past tense that has not happened; no promises of
  results or dates; no internal jargon before it is explained.
- Write the source locale first, then every locale in `<locales>` in the same register, using the
  translation glossary. Legal or pricing statements are not paraphrased in translation.

## 4. Register

- Add or update the item in `<registry path>` (slug, key, dates). Set `factsCheckedOn` /
  `checkedOn` to today only after re-reading every source; the page shows that date.
- Titles and descriptions go in `<messages dir>` under the item's key, in every locale.
- Metadata through `<SEO metadata builder>` (title, description, canonical, alternates, og image);
  JSON-LD only when it matches the visible text.
- `llms.txt` is optional. Update it only if the repo keeps one; it does not affect Google Search.

## 5. Verify

- Run the content guard (`<content registry test>`), i18n parity and the assets test.
- Open the page in the running site in two locales, at phone and desktop width.
- List every source URL with the date you read it in the PR body.

## Never

- Invent a statistic, a quote, a customer or a review.
- Claim a competitor lacks something without a dated source showing it.
- Bump a `checkedOn` date without re-reading the sources.
