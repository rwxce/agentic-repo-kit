<!--
TEMPLATE: pr-scope skill — freeze a PR's scope and route out-of-scope review findings to follow-up
PRs. Include when PRs grow under review (many commits after the first review comment, PRs closed
unmerged after long review threads) or when an automated reviewer is in the loop. Fill: the base
branch, the PR-creation command (`/pr-make` or equivalent), the triage command (`commands/pr-triage.md`).
Strip this comment when writing the file (frontmatter must be the first thing in SKILL.md).
-->
---
name: pr-scope
description: >-
  Freeze a PR's scope and route the review findings that fall outside it to follow-up PRs,
  instead of growing the PR to cover them. Use before creating or pushing to a PR (precheck),
  when triaging review comments on an open PR, and when splitting a feature into one-theme PRs
  before any code exists.
targets: ["*"]
---

# PR scope (freeze the scope, route the rest)

Reply in the user's language. Be direct; if the scope has blown up, say so without softening it.

## Why it exists

Big PRs fail in a predictable way: most of their commits arrive **after** the first review
comment, files touched for the first time keep appearing round after round, and the PR diverges
until it is closed unmerged with its review thrown away.

The cause is neither bad faith nor carelessness. The reviewer finds true things that do not say
"this is wrong" but **"this is inconsistent with something you didn't touch"**. Each one is
irrefutable and each one is new work. Since rejecting them one by one is impossible, they all get
in and the PR diverges.

This skill is not for resisting findings. It is for **routing** them: saying "not here" leaves a
written record with acceptance criteria, so it never means leaving it unfixed.

## Mandatory principles

- Never grow a PR's scope to cover a finding outside the baseline.
- Never mark a finding as resolved without evidence in the diff.
- Never delete a finding: it is resolved, deferred with its own block in the record, or
  discarded with a written reason.
- The record is **private**: returned in the conversation or the session scratchpad, never as a
  repo file, and never published to GitHub by an agent unless the user explicitly authorizes
  that publication.
- Severity does **not** override the scope rule. A P1 outside the baseline is deferred, not
  fixed here.
- Do not invent findings or severities: if the reviewer gave no badge, mark it as assigned by you.
- `gh` reads are always allowed. Writes need explicit permission each time; a PR-creation
  request already is that permission for its own commit, push and `pr create`.
- Do not write any file without first showing the proposal and waiting for approval. The
  exception is the chained precheck inside the PR-creation command (§6.1): it applies in-scope
  fixes without stopping.

## The three modes

| Mode | When | Entry |
|---|---|---|
| **Pre-code** | Before opening the branch: split the feature into one-theme PRs | `plan-feature` (the PR map, §6.0) |
| **Pre-PR** | Before creating or pushing to the PR, on your own diff | chained in `<pr-make command>` (precheck, §6.1) |
| **Triage** | On an already-open PR with comments | `/pr-triage <PR>` (§6.2) |

Pre-code is the cheapest: a PR born with a single theme never needs splitting later. Pre-PR is
next: review loops at 5 commits cost hours, at 40 they cost days. Splitting by **layer** (auth,
backend, UI) instead of by **outcome** still leaves each part mixing several themes.

## The hard rule, in one sentence

A finding is fixed inside the PR **only if** the defect is in a file that was already in the
baseline **and** the fix creates no new surface (file, column, migration, route, dependency,
vendor). Everything else is deferred — except a **completion** (§2.0): without it, the code already
in the diff does not work in production.

## The exception that unblocks you

If the finding means the PR **as it stands** exposes an exploitable vulnerability or breaks a
published legal promise, it is not deferrable. But the right answer is **to remove the piece with
the hole from the PR**, not to grow the PR to defend it.

## Seals

- `node scripts/pr-precheck-seal.mjs check|write [base]` — the precheck already ran on this exact
  diff; a fresh seal skips a repeat run.
- `node scripts/review-seal.mjs check|write [base]` — an independent (fresh-context) review ran on
  this exact diff; written by `pr-review` with `Type: independent`.

## Full reference

- Procedure: `references/pr-scope.md`
- Finding classes the precheck hunts for: `references/adversarial-review.md`
