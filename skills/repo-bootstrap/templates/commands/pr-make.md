<!--
TEMPLATE: /pr-make command — create a PR from the current branch, end to end, in one request.
REPO SIGNAL: agents open PRs; a PR template with a review lane; the pr-scope precheck seal
  (hooks/pr-precheck-seal.mjs) and the independent-review seal (hooks/review-seal.mjs). Drop the
  steps whose mechanism the repo does not have (precheck, review seal, plan folder, layout guard).
FILL: <integration-branch>, <release-branch-prefix> and <release-branch> (or delete the release
  guard), <production-branch>, the review-policy doc path, the skills dir, the UI paths that
  trigger the layout guard and its command. Keep the attribution lines your harness requires.
Lands in `.rulesync/commands/pr-make.md` (or `.claude/commands/`). Strip this comment.
-->
---
description: Create a pull request from the current branch (commit, push and open it, no extra confirmation)
targets:
  - '*'
---
Create a pull request from the current branch. The user's request (including invoking `/pr-make`)
authorizes writing the complete title and body, committing and pushing the task's changes if
needed, and creating the PR. Complete the flow without asking for another confirmation or a
human-written section. Honor an explicit request for a preview only. Never merge, approve, or
publish comments or reviews.

## Step 1: Preflight

Run `which gh`. If it is missing, tell the user to install the GitHub CLI and run the command
again, then **stop**.

## Step 2: Arguments

Arguments: `$ARGUMENTS`

- `draft` → pass `--draft`. `preview` → preview only (Step 6).
- `no-precheck` → skip the precheck gate (Step 3a). Only the user's explicit word does this.
- Any other word → the `--base` branch.
- No base given: `<integration-branch>`, unless the branch starts with `<release-branch-prefix>`,
  in which case `<release-branch>`.
- **Guard (mandatory):** never open a PR against `<production-branch>`. PRs into
  `<release-branch>` come only from release branches opened by the release workflow. Explain the
  release procedure and stop for either.

## Step 3: Gather context and prepare the branch

```sh
git branch --show-current
git status --short
git diff
git diff --cached
git fetch origin <base>
git log origin/<base>..HEAD --oneline
git diff origin/<base>...HEAD
gh pr list --head <current-branch> --state open --json url,baseRefName,headRefName
```

Read relevant untracked task files too. A failed fetch or GitHub lookup is a blocker, not evidence
that nothing exists. Never rename the branch, and never commit or push directly on a long-lived
branch; if a task branch is missing, report the blocker.

- Identify the task's changes from the conversation and the actual diff, generated files included.
  Leave unrelated work untouched; if ownership is unclear, ask one focused question.
- Run the precheck gate (Step 3a) before staging or committing anything.
- Then run the checks the changes call for (lint, typecheck, tests, the repo's own checks), so they
  also cover any fix the precheck applied. Fix task-related failures; report real blockers. Never
  invent evidence or results.
- **Plan folder.** If this is the last PR of an initiative under `docs/plans/<initiative>/`, close
  it as `plan-feature`'s `references/plan-folder.md` says: promote what must outlive it, delete the
  folder, add `Closes-plan: <initiative>` to the body with the promoted items.
- **Layout guard.** If the diff touches `<ui-paths>` (pages, components, styles, translation
  files), run `<layout-guard-command>` (test-guards/layout: fixed widths plus a width sweep)
  against this worktree's dev server. If none is listening, ask the user to start it and pass its
  port. A failure is a blocker: fix it, or mark a deliberate overflow with `data-allow-overflow`.
  Put the result in the body.
- If fixing a check edited files, run the gate (Step 3a) again before staging. At most 3 gate
  re-runs; past that, report a blocker and do not publish.
- Stage only the identified files or hunks, inspect the staged diff, commit with an English
  conventional message. No blanket staging, no amends.
- Re-read the final `origin/<base>...HEAD` diff and commits: every commit must belong to the task.
  No task diff and no PR → say there is nothing to open and stop.
- An open PR already exists for this branch and base → push pending task commits normally and
  return its URL, without a duplicate or a body edit. Different base → report the mismatch.
- Push with `git push -u origin <current-branch>`. Never force-push; a rejection is a blocker.

For a preview, gather context and prepare the title and body without committing, pushing or
creating anything.

## Step 3a: Precheck gate

```sh
node scripts/pr-precheck-seal.mjs check <base>
```

- Exit 0: the precheck already ran on this exact diff. Say so and continue.
- Exit 1: run the pr-scope precheck loop in chained mode (`<skills dir>/pr-scope/references/pr-scope.md`)
  over the task changes, uncommitted and untracked included. Apply completions and in-scope fixes,
  carry deferred extensions into `## Follow-ups`, then
  `node scripts/pr-precheck-seal.mjs write <base>`, **only if every changed path belongs to the
  task** (no unrelated dirty or untracked file, only task commits ahead of the base): the seal
  hashes merge-base -> working tree, so sealing unrelated changes would let them skip a precheck.
  Do not pause between rounds. Stop only on a blocker (an in-scope finding still open after 3
  rounds) and report it.
- Exit 2: if the message suggests `git fetch`, fetch the base once and retry; else report it.
- A preview runs the gate too (fixes land in the working tree, nothing is committed).

Then the independent review (a warning, not a gate):

```sh
node scripts/review-seal.mjs check <base>
```

If the PR is flow-sensitive (`<review-policy-doc>`) and the seal is stale or missing, say so before
publishing: "no independent review on this diff; run the review in a fresh context". Never write
that seal from this session: only the fresh-context reviewer does.

## Step 4: Title

Infer a conventional type (`feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`, `perf`) and
write `type: short description` (lowercase, no period, under 70 characters).

## Step 5: Body

Use the repo's PR template (`.github/pull_request_template.md`) when there is one; otherwise this
structure. Pick the lane from `<review-policy-doc>` and the diff: a sensitive path always wins, and
when unsure choose flow-sensitive.

````
## Flow and failure modes
Flow-sensitive: entry point, data and effects, failure behaviour verified in the diff.
Demonstrable: what the evidence must prove. Write it yourself; never leave a placeholder.

## What
2-3 sentences: what changed and why.

## Review lane
- [x] **Demonstrable** — approval on evidence and green CI.
- [ ] **Flow-sensitive** — independent fresh-context review plus maintainer verification of the flow.

Why this lane: one sentence.

## Diagram
A Mermaid `flowchart` of the main flow this PR adds or changes: 3-6 plain-language boxes, left to
right, one short technical callout only where it matters (auth, idempotency key, retry). Mandatory.

## Evidence
Screenshots, video, representative output or run logs.

## Tests
Commands and manual scenarios run.

## Follow-ups
Out-of-scope work, or `None`.
````

Exactly one lane box is ticked. **Guard:** never continue with an empty Diagram; if there is truly
no flow (a copy change), write one line saying why.

## Step 6: Check the content

Every section complete and grounded in the final diff. Report only checks actually run; say which
were not run. Title, body and commits in English. Preview only → show title, base, draft status and
body, then stop.

## Step 7: Create the PR

Check again for an open PR on this branch first (return it if found; report a base mismatch). After
a failed creation, look the branch up before retrying, so a partial success is not duplicated.
Write the body to a temporary file and pass `--body-file`; quote the title safely.

```sh
gh pr create --title '<title>' --body-file <body-file> --base <base> --head <current-branch> [--draft]
```

Print the PR URL. Creating the PR does not authorize merging, editing another PR, or publishing
comments or reviews.
