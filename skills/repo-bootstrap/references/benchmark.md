# Phase 3 — the big-feature benchmark

The single step that revealed the real gaps in the source project. A small feature looks fine with
any setup; a big cross-cutting one shows what planners miss. In the source project, every planner
without a protocol missed 3-6 of 18 cross-cutting effects and none checked the provider's docs
(the provider already offered the feature natively); with the protocol + sweep + fresh reviewer,
the pipeline found ~17 of 18. The model mattered less than the method: with a written protocol a
cheaper model found nearly as much as the expensive one.

## 1. Pick the feature
Invent one feature this repo could plausibly ship that touches at least four of: data model,
access control/roles, money or an external paid service, scheduled/background work, UI in several
places, user-facing copy or legal promises, emails/notifications, deletion/retention.
Examples by product type: team workspaces with roles and per-seat billing (SaaS); refunds with
partial returns (e-commerce); shared documents with link permissions (content tools).

## 2. Run planners in fresh contexts
2-3 subagents, launched in one message, **new contexts** (never the current chat — it would leak
your reasoning), read-only. Variants that teach the most: the main model alone · a domain
specialist (if one exists) · a cheaper model. Prompt:

```text
READ-ONLY: do not edit, create or delete files, no mutating commands.
Feature request: "<feature>".
Produce the implementation plan only, following this repo's planning rules if any. Base it on the
real code. Pay special attention to side effects: what existing behaviour would break or misbehave
because of this change. Max 1000 words, with a section "Side effects / things that would break",
each with file:line evidence, and a line "Docs checked: …" listing official docs consulted.
Last line: "Files read: N, searches: M".
```

## 3. Build the master list
Union all side effects, dedupe, and **verify each in the code** (drop the ones that are wrong).
Score each planner: found / total, docs checked yes/no, tokens, time. Typical classes of misses:
- a parser or catalog that silently mis-reads a new type (e.g. a new price type read as 0);
- a gate that checks the viewer instead of the owner;
- copy or legal text that promises the opposite of the feature;
- lifecycle emails or jobs that now target the wrong audience;
- audit/consent evidence recorded against the wrong actor;
- rate-limit keys or exemptions shared between people who should not share them;
- deletion/retention cascades that miss the new tables.

## 4. Use the results
- **Registry seed**: one row per *class* of effect in `side-effect-registry.md`, each with its
  trigger and the search to run.
- **Agents**: a domain where planners lacked build knowledge (wrong helper, missed convention) is a
  candidate for an implementer agent with Build rules; a domain where all planners did fine is not.
- **Protocol**: if no planner checked official docs, docs-first becomes a mandatory written step
  of the plan-feature skill (`Docs checked: <url> — already does it? yes/no/partial`).
- Keep the master list in `.context/repo-bootstrap/benchmark.md`; re-run the same feature in
  Phase 6 with the new protocol and report before/after.

## Cost control
- Planners: ~100-120k tokens each. The full pipeline with sweep subagents and a fresh reviewer that
  re-explores everything costs ~370k; feeding the reviewer the sweep tables and capping its tool
  calls brings it to an estimated 200-250k.
- Quick depth skips the benchmark; the registry is then seeded from the catalog's generic rows.
