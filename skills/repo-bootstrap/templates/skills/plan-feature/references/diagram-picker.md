<!--
TEMPLATE: plan-feature reference — which diagram answers which question. Include with
plan-feature. Nothing to fill. Strip this comment when writing the file; keep the attribution
comment at the end (CC BY 4.0 requires it).
-->
# Diagram picker

A diagram earns its place by answering an engineering question or exposing a problem, not by
decorating the plan. Choose the type from the question. `flowchart` is one option among many, not
the default. A code index says what is related in the code; this file says how to draw it. Draw
from real files and decisions, and verify index results in the source first.

| Question | Type | Keyword |
|---|---|---|
| What steps or branches does a process take? | Flowchart | `flowchart LR` |
| Who calls whom, and in what order? | Sequence | `sequenceDiagram` |
| What states can it be in, and what moves it? | State | `stateDiagram-v2` |
| How does the data relate, and with what cardinality? | Entity relationship | `erDiagram` |
| What is the system's boundary, and who uses it? | C4 context | `C4Context` |
| Which apps, services and stores exist? | C4 container | `C4Container` |
| What happens when, and in what order over time? | Timeline | `timeline` |
| How do PRs and waves depend on each other? | Flowchart of dependencies | `flowchart LR` |
| Which requirement traces to what? | Requirement, only if the graph itself matters | `requirementDiagram` |

Rules:

- At most 15 nodes. Split rather than shrink. Use `subgraph` to group.
- Short labels, and verbs on arrows.
- One diagram per question. In a big plan, usually one to four in total. Small work needs none.
- No theme or `%%{init}` block: it is noise in the raw text.
- Avoid `architecture-beta`: its docs warn of backwards-incompatible changes.
- Viewers differ. GitHub renders Mermaid, a terminal shows raw text, so the surrounding text has
  to carry the meaning without it.

<!-- Selection-matrix approach and density limits adapted from "Mermaid Studio" by Felipe Rodrigues / Tech Leads Club (https://github.com/tech-leads-club/agent-skills, packages/skills-catalog/skills/(tooling)/mermaid-studio), licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Changed: reorganized around engineering questions, reduced to the types used here, theming rules removed. Keep this attribution comment in the generated file. -->
