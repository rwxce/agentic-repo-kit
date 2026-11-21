<!--
TEMPLATE: plan-feature reference — engineering methods picked by risk (step 1c). Include with
plan-feature for normal/big work. Fill: drop the rows for areas the repo does not have (tenancy,
payments, personal data). Strip this comment when writing the file.
-->
# Method picker (step 1c)

Pick engineering methods by the risk in front of you, never as a checklist. **A method enters the
plan only if it can change a decision.** Write one line per chosen method:
`Method: <name> — <the question it answers here>`. No trigger matches → `Methods: none`.

Small work picks nothing unless a trigger clearly applies.

| If the change… | Method | Cheapest useful form | Skip when |
|---|---|---|---|
| Carries any non-trivial risk | Risk-driven design | Top risks, the technique for each, residual risk | Copy changes |
| Depends on unproven technology | Spike | `evidence-and-spikes.md` | The answer is in the code |
| Has states or error behaviour | EARS requirements + state diagram | `While… / When… / If…, then…` lines | Still exploring |
| Touches tables or fields | Entity relationship model | `erDiagram` with cardinality and indexes | No data change |
| Adds a service or trust boundary | C4 levels 1-2 | Context and containers only | Inside one module |
| Has its own algorithm | Algorithm design | Pseudocode, heuristics, complexity, invariants, one worked example | Plain CRUD |
| Moves data between systems | Data flow | Source, transformations, storage, consumers | Single-module data |
| Touches auth, payments, webhooks, tenancy | Threat modeling | What are we building, what can go wrong, what do we do, did it work; STRIDE as prompts | No new trust boundary |
| Adds personal data flows | LINDDUN GO | Relevant threats, next to the compliance check | No personal data |
| Touches billing, migrations, jobs | Lightweight FMEA | Failure, effect, detection, recovery, covering partial failure, retries, idempotency, concurrency | Reversible UI |
| Uses one term with two meanings | Bounded contexts | Short glossary and who owns each meaning | One clear model |
| Has a property that can regress | Fitness function | One test or CI check | One-off properties |
| Spans many requirements and PRs | Traceability | `Requirement → Decision → PR → Test` columns | One PR |

Already covered, so do not duplicate: use cases (`docs/use-case-matrix.md`), dependency and impact
analysis (consumer sweep, `docs/side-effect-registry.md`, PR map), and test design (invariants and
`verify-integration`).

Left out on purpose: UML class diagrams, full arc42 documents and formal DDD aggregates. They rarely
change a decision. Use one only if a specific question needs it.

Each model must answer a question or expose a problem. If it only restates the text, drop it.
