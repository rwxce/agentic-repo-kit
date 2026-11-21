# Comparison ("vs" / alternative) pages

A comparison page is read by someone already considering the other tool. It earns trust only if
it is fair and verifiable; one false claim about a competitor costs more than the page brings, and
can be a legal problem (comparative advertising rules apply in many jurisdictions: ask the founder
whether counsel should review the template once).

## Shape

1. **Who each tool is for**: one paragraph each, in neutral terms.
2. **Comparison table**: rows are the decisions the reader makes (price model, main workflow,
   control, platform support), not a feature checklist chosen to win. Each competitor cell is
   backed by a source URL.
3. **When the other tool is the better fit**: a real section, with real cases. Keep a count of
   these rows next to the count of rows where the product fits better; both are honest.
4. **When the product is the better fit.**
5. **What users say** (optional): faithful summaries of public opinions with links; none from
   reviews written by competitors.
6. **FAQ**: only questions people ask; JSON-LD only if it matches the visible text.
7. **"Facts checked on <date>"** visible on the page, from `checkedOn` in the registry.

## Rules

- `checkedOn` is one date for the whole page and is bumped only after re-reading every source.
  The content test fails when it is older than the allowed age.
- Prices and plan names of the competitor are quoted as they appear on its pricing page that day;
  if the page is unclear, say "see their pricing page" instead of guessing.
- Never use the competitor's logo or trademarks beyond naming it.
- Our own facts (plans, limits, features) come from config, never hard-coded on the page.

Example (reference project, not a default): three comparison pages shared one "checked on"
constant shown on the page, plus a second date for public user quotes, and each page had a "when
the other tool fits better" section. Nothing failed when the dates aged; the freshness check in
`content-registry.ts` is the kit's addition to close that gap.
