<!--
TEMPLATE: docs/adr/NNNN-<slug>.md — one architecture decision, its alternatives scored on
checkable criteria, and the check that enforces it. Filled in Phase 1b
(`references/system-design.md`, step 6 for new projects, step 2 for retroactive ones). Signal: a
decision that is load-bearing and could be undone by accident. Never use stars, download counts as
a quality proxy, scores out of 10 or weighted totals: write the value and its source.
-->
# <NNNN>. <Decision title>

- **Status:** <proposed | accepted | accepted (recorded retroactively) | superseded by NNNN>
- **Date:** <YYYY-MM-DD>
- **Requirements and risks:** <R-ids and H-ids from the system design>

## Context

<The forces at play, in a few lines: the requirement, the constraint, what is known and how
(evidence tags).>

## Alternatives

Hard constraints first: any alternative that fails one is eliminated and the row says which.

| Criterion | <Alternative A> | <Alternative B> | <Stay as is / Alternative C> |
|---|---|---|---|
| Maintenance activity (last release, releases in 12 months, maintainer replies) | <value · source> | | |
| License (SPDX at the exact version, fits how we ship) | <value · source> | | |
| CVEs of the exact version (OSV, fixed-in) | <value · source> | | |
| Breaking changes (majors in 24 months, migration guide) | <value · source> | | |
| Modelled cost (formula at launch and at 10x, pricing page + date) | <value · source> | | |
| Lock-in (proprietary APIs, export format, exit cost in PRs) | <value · source> | | |
| Fit (requirement ids met, with evidence tags) | <R-1 verified, R-2 read> | | |
| Eliminated by | <hard constraint or "—"> | | |

## Decision

<What we choose, in one or two sentences, and the trade-off that decided it, naming the
requirement or risk behind it.>

## Enforced by

| Check | Path | Fails on |
|---|---|---|
| <import-boundary lint rule · architecture test · dependency allowlist · OSV scan in CI · contract test · cost alert> | `<path or workflow>` | <the concrete violation it catches> |

<!-- If no check can hold this decision: "review-only — <why>", and who reviews it. -->

## Consequences

- <What becomes easier>
- <What becomes harder, and the residual risk>

## Revisit when

<An observable signal: a CVE without a fix for N days, cost above the ceiling, a requirement
change, end of support of a version.>
