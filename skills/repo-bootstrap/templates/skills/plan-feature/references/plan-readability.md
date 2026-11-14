<!--
TEMPLATE: plan-feature reference — how a plan is ordered so it can be read and decided on.
Include with plan-feature. Nothing to fill. Strip this comment when writing the file.
-->
# Plan readability

The user reads the plan to understand and decide, and implementers read it to execute. Keep all
the technical depth, but order it so the reader meets the whole before the parts. Never simplify
concepts away, and never write down to the reader.

## One-page summary (normal and big, first thing in the plan)

- **What and why:** the outcome, in two or three sentences.
- **How it works:** one concrete input → processing → output example.
- **The moving parts:** how the components connect, with at most one diagram.
- **Decisions needed from you:** with a recommendation for each.
- **Biggest risk:** the top hypothesis and its evidence tag.

## Order

Goal → how it works → architecture → implementation. The executable detail (files, rate limits,
handoffs, roadmap) comes after the summary, for implementers.

## Rules

- Say what each component reads from and hands to the next: relations, not only a list.
- Give each decision its alternatives and consequences, not only the outcome.
- Separate facts, hypotheses and decisions with the tags in `evidence-and-spikes.md`.
- State each thing once and link to it. Do not repeat a decision in several sections.
- Drop anything that would not change what the reader does.
- A plan must make sense with its diagrams left unrendered.

## Discussion replies

During a plan discussion, answer the doubt in hand: the point, the evidence, the alternatives and
a recommendation. Show only what changed, and do not re-post the plan.
