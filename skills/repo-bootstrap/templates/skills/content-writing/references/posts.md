# Posts and guides

## Shape

1. **Title**: the reader's question or the outcome, in their words. No clickbait, no year unless
   the content really expires.
2. **Answer first**: the first paragraph answers the question in two or three sentences.
3. **Body**: steps or sections in the order the reader acts. Each section heading is a question or
   an action.
4. **Where the product fits**: one honest section, after the reader already has the answer. Name
   what it does not do when that matters for the decision.
5. **Sources**: links to every third-party page used, visible in the article when the post makes
   claims about other tools, with the date the facts were checked.

## Rules

- Same slug in every locale; per-locale body files sit next to each other.
- One author identity, defined once (site entity), reused in JSON-LD.
- A post that compares tools sets `factsCheckedOn`; the test fails when it is older than the
  allowed age, which is the reminder to re-check.
- Cover and og image exist on disk for every post (assets test); og images in PNG/JPG.
- `updatedAt` only for material revisions, not typo fixes.

## Checklist before the PR

- [ ] Question and doubt named in the PR body.
- [ ] Every external claim has a URL read today.
- [ ] Source locale reviewed, every locale present, glossary terms respected.
- [ ] Registry entry, messages, assets, sitemap/RSS (generated from the registry).
- [ ] Seen in the running site at phone and desktop.
