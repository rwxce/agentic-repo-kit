<!--
WHAT: PR template whose "Review lane" section is machine-read by review-routing (ci/review-routing/).
REPO SIGNAL: more than one reviewer or agent-authored PRs; reviews that vary in depth for no reason.
CONFIGURE: keep the two lane lines exactly as written ("- [ ] **Demonstrable**" / "- [ ] **Flow-sensitive**"):
the routing script matches them. Rename the lanes only together with the script.
-->
## Flow and failure modes

<!-- Flow-sensitive: entry point, data/effects, and what happens on failure. Demonstrable: one line
     on what the reviewer should check in the evidence to be convinced. -->

## What

<!-- What changed and why? -->

## Review lane

Select exactly one. Missing or multiple selections default to **flow-sensitive**.

- [ ] **Demonstrable** — fast approval based only on evidence and green CI.
- [ ] **Flow-sensitive** — another reviewer must understand and approve the flow.

**Why this lane:**

## Evidence

<!-- UI: screenshots/video (mobile + desktop). Prompts: representative output. Non-visual: the
     command and its output, or the failing test that now passes. -->

## Tests

<!-- Commands and manual scenarios run. -->

## Follow-ups

<!-- Out-of-scope findings deferred to other PRs, or "None". Do not grow this PR to cover them. -->
