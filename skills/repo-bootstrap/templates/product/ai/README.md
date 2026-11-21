# Product-AI module

Opt-in. Propose it only when product features call an LLM (generation, classification,
extraction, agents). Developer tooling that uses AI in the editor is not this module; a CLI or a
library without AI features gets none of it.

| Pattern | Template | What it prevents |
|---|---|---|
| **Model ids per environment** | `model-ids.ts` (+ test) | a model hard-coded in five places; dev silently using the prod model or the reverse; a provider nobody approved receiving user data |
| **Safe schema** | `strict-json-schema.mjs` (+ test) | structured output that worked for months failing the day a router sends the call to a stricter upstream |
| **Prompt version** | pattern below | not knowing which prompt produced a stored output; prompt edits shipping without a test noticing |
| **Cost per feature** | pattern below | one feature quietly costing more than the plan it ships in |
| **Blind-judge eval** | `eval.md` | switching models on vibes; an eval that measures a copy of the prompt instead of what ships |

**Related concept cards:** `llm-boundary` (validate every response at the boundary, typed errors),
`rate-limit-by-cost` (limits sized by the external cost), `compliance-by-evidence` (AI providers
are processors: they belong in the vendor matrix and the privacy text).

## Model ids per environment

One env var per feature (`AI_<FEATURE>_MODEL`), set in every environment's secrets store and
documented in the env registry. No default in code. Ids are `<provider>/<model>` and the provider
must be on the approved list (the processors the legal module recorded). Read at call time. A
smoke check lists unset required vars after each deploy.

## Safe schema

Send the strict dialect, validate with the original. Constraints a given upstream breaks (found
by the eval, e.g. minimum item counts) go to `EXTRA_DROP` with the evidence in a comment, scoped to
the model or provider when possible. Route with "require parameters" (or the router's equivalent)
so a provider that ignores the schema is never picked.

## Prompt version

Each prompt builder exports `<FEATURE>_PROMPT_VERSION = "v<n>"`. Every stored generation records
the version (and the model id). A test pins the current version, so editing the prompt fails the
test until the author bumps the version on purpose; the eval's results file names the version it
measured.

## Cost per feature

Log one row per AI call, written by the single function that calls the provider:

| Field | Note |
|---|---|
| `feature` | the `ModelKey` |
| `model`, `provider` | as returned by the router (the served provider can differ from the requested one) |
| `promptVersion` | from the builder |
| `inputTokens`, `outputTokens`, `costUsd` | as reported by the provider; absent rather than guessed |
| `outcome` | `valid` · `recovered` · `invalid` · `error` |
| `generationId` | the provider's id, to reconcile with its dashboard |
| `tenantId` | internal id only; no prompt text, no personal data |

Retention for this table goes into the retention plan. A weekly query of cost per feature and per
plan tier tells you whether pricing still covers usage.

## Blind-judge eval

`eval.md` holds the procedure and the results log. The harness imports the app's prompt builder
and schema, replays sanitized fixtures, records validity, latency, tokens and cost, and has at
least two judges score shuffled, unlabelled outputs against a rubric. It recommends; the founder
decides; nobody changes an env var from inside the eval.

**Example (reference project, not a default):** six features each read their own
`AI_*_MODEL` var with an allow-list of three providers; a schema helper targeted the strictest
dialect after a routed call started failing; the generation prompt carried a version pinned by a
test; brand analysis had a blind eval with eight criteria and two judges, and an AI request log
recorded model, provider, outcome and cost per call.
