<!--
TEMPLATE: plan-feature reference — evidence levels, hypothesis gate and feasibility spikes.
Include with plan-feature. Fill: the read-only commands of this repo (code index, registry view)
and its verification commands. Strip this comment when writing the file.
-->
# Evidence and spikes (steps 3 and 3b)

A plan must show what is known, what is assumed and what was disproved. Reading docs or a README
is not proof that something works. The goal: no architecture rests on a critical assumption
nobody has checked.

## Evidence levels

Tag every claim the design depends on.

| Tag | Meaning | Reached by |
|---|---|---|
| `assumed` | Believed, not checked | Default |
| `read` | Stated by docs, a README or source code | Reading |
| `verified` | Seen working with representative input | An authorized spike, or existing tests or production data |
| `refuted` | Checked and false | Reading or running |
| `accepted` | Unverified, and the user takes the risk | The user's explicit decision |

Reading source code can refute a claim, and it is free: read the code path before proposing a
run. Project context shapes what to ask, but it is not evidence that a third-party tool works.

## Hypothesis gate (step 3b)

List the hypotheses that could invalidate the architecture, most damaging first:

| Id | Hypothesis | If false | Evidence | Next step |
|---|---|---|---|---|

- **Critical** means that, if false, the design, a dependency or a data model has to change.
  Typical questions: can this library really return the data we need? Does the API support the
  feature? Does the model hold the output contract? Is it compatible with our environments? Does
  the algorithm work on representative data? Is the migration safe with old data? Are latency,
  cost and concurrency acceptable?
- **The gate:** do not write schema, dependency pins, file lists or a roadmap that depend on a
  critical hypothesis until it is `verified`, `refuted` or `accepted`. Plan around it instead:
  discuss it, resolve it by reading, or propose a spike.
- When a critical dependency is a third-party tool, compare it with at least two alternatives,
  including ones the request did not name. Coverage of the real case decides, not the README.
- No critical hypotheses → one line: `Hypotheses: none critical (<why>)`.

## Spike card

A spike is the smallest throwaway experiment that resolves a critical hypothesis. Order spikes by
which one is most likely to kill the idea. One happy-path run never makes a hypothesis `verified`.

```markdown
### S-<n> — <title>

- **Hypothesis:** <H-id and the claim>
- **Procedure and tools:** <steps; Given / When / Then if it helps>
- **Inputs and data:** <what it needs, and where the data comes from>
- **Expected result:** <what you predict>
- **Success criteria:** <objective threshold>
- **Failure criteria:** <objective threshold>
- **Cost, time, risks, side effects:** <money, credits, duration, what it touches>
- **If it fails:** <the alternative>
- **Evidence:** <where the result is recorded>
- **Compliance:** <personal data involved? Synthetic data by default; any real data needs the
  root rule's compliance check first>
```

Spike code stays in `.context/spike/<id>/` (git-ignored), outside the product code and its
databases, and is deleted when the spike ends. The result goes to `evidence.md` in the plan
folder, or to the plan when there is none. `evidence.md` never contains personal data. Hypotheses
and evidence tags are exempt from "the plan body changes only on consolidation": they are updated
as soon as a spike or reading settles them.

## Permission

**No spike runs without the user's explicit OK for that spike id** (`OK S-3`). This covers local
scripts, benchmarks, connections to external services and installs made to try something.
Authorizing one spike does not authorize another, the implementation, or any extra operation.

| Kind | Examples | Permission |
|---|---|---|
| Reading | `rg`, `<code index query>`, `gh` GET, `npm view`, reading code and docs | Existing permissions |
| Spike | Scripts, benchmarks, external connections, installing to try | Explicit OK per spike id |
| Verification after the "go" | `<lint>`, `<typecheck>`, `<test>`, `verify-integration` of an approved item | Existing rules |

A spike never has a default: if the user does not answer, it does not run. In a roadmap a spike
is always `Stops the loop? yes`. A spike without an OK inside a running loop stops the whole loop,
so spikes are done before the "go", during the discussion.

**Running an authorized spike in plan mode**, which allows no execution: leave plan mode only for
that spike, confined to `.context/spike/<id>/`. Leaving plan mode for this is not a "go" for the
implementation. When this permission rule and any autonomy rule disagree, this one wins.

## After a spike

Update the hypothesis tag, record the evidence, say what changes in the plan, and return to the
discussion. A `refuted` critical hypothesis reopens every decision that depended on it.

<!-- Spike shape and evidence tagging draw on ideas from open-gsd/gsd-core, github/spec-kit and bmad-code-org/BMAD-METHOD (all MIT); the text is original. -->
