<!--
TEMPLATE: model eval procedure and results log (product-AI module). Lands as
`docs/evals/<feature>.md` and `docs/evals/<feature>-results.md`. REPO SIGNAL: an LLM feature whose
model choice or prompt changes over time. Fill per feature. Strip this comment.
-->
# <Feature> model eval

How to compare models (or prompt versions) for `<AI_FEATURE_MODEL>`. Results and the decision they
led to live in `<feature>-results.md`. An eval recommends; it never changes an env var or a prompt
by itself.

## What it measures

The harness (`<scripts/evals/feature/>`) replays the **app's own** prompt builder and schema
(imported, not copied) against sanitized fixtures in `fixtures/`, for each model passed. Because
the prompt is imported, the eval always measures what ships.

Per call: valid on the first try (against the original schema), latency, input/output tokens, and
the cost the provider reports. Quality is judged **blind**:

| Criterion | Question (scored 1-5) |
|---|---|
| `<grounded>` | <nothing invented about the input> |
| `<useful>` | <the output does the job the feature promises> |
| `<distinct>` | <no two items say the same thing> |
| `<format>` | <fits the length, register and structure the UI needs> |

## Run it

1. **Dry run** — prompts and call count, no network, no cost.
2. **Real run** — needs the provider key; ask before touching the secrets store. Outputs that
   exist are skipped, so a re-run never pays twice. Outputs go to a git-ignored folder.
3. **Blind judging** — every model's outputs per fixture are shuffled with a fixed seed and
   labelled A/B/C; at least two judges (different model families, or a person) score them with
   the rubric and the fixture's source text, so they can check facts. Aggregate, then unblind.

## Rules

- Fixtures are sanitized: no personal data, no customer content without consent.
- Same fixtures, same rubric, same seed across rounds, or the round says what changed.
- A model is recommended only if it beats the current one on quality without failing validity,
  with cost and latency reported next to it.

---

# <Feature> eval results

## Round <n> — <date> — <question asked>

| Model | Valid first try | p50 latency | Cost / call | Quality (mean of judges) | Notes |
|---|---|---|---|---|---|

**Decision:** <keep / switch to X / change prompt to vN>, by <founder>, because <reason>.
