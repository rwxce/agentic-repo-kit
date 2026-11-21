<!--
TEMPLATE: /pr-triage command — triage an open PR's review comments against a frozen baseline.
Include with the pr-scope skill. Fill: the skills path (`.rulesync/skills/` or the native dir).
Lands in `.rulesync/commands/pr-triage.md` (or `.claude/commands/`). Strip this comment.
-->
---
description: Triage an open PR's review comments into in scope / deferred against a frozen baseline
targets:
  - '*'
---
Triage an open PR: classify each review comment as **in scope** or **deferred** against a frozen
baseline, and route the deferred ones to follow-up PRs instead of growing the current PR.

**Minimum input**: PR number or URL. If `$ARGUMENTS` is empty, do not ask right away: first check
whether the current branch has an associated PR with `gh pr view --json number,url` (read-only,
always allowed). If found, use it. If not, ask the user which PR number or URL they want.

**Instructions**:

- Use the `pr-scope` skill, triage mode.
- Follow the canonical procedure: `<skills dir>/pr-scope/references/pr-scope.md` (§1.2, §2, §6.2).
- Apply the hard rule **before** looking at severity: severity decides the follow-up's urgency,
  never whether it gets into this PR.
- Once the completion/in-scope fixes are applied, run their precheck (§6.1 in triage mode, step 5
  of §6.2) before closing the triage. Write the seal
  (`node scripts/pr-precheck-seal.mjs write <base>`) only under step 5's conditions.

**Expected output**:

1. Derived baseline and the boundary of the first review event.
2. Scope metrics: % reactive commits, review rounds, new files per round, scope growth.
3. Table of every finding with its verdict.
4. Split plan: the deferred ones grouped into follow-up PRs by **technical dependency**, each group
   with a proposed title, grouping reason and whether it blocks the merge.
5. Post-triage precheck status: "done (seal written)", or "pending: will run in the PR-creation
   command before the push" if the user stopped it or the fixes are left for later.
6. Final recommendation: continue, or partial-merge-and-split if more than 3 rounds have passed.

**Hard rules (reminder)**:

- `gh api` always with `--paginate`. Without it the API cuts at 30 and the count is wrong.
- `gh` reads always allowed without asking; writes need explicit permission each time.
- The record is returned in the conversation or private scratchpad, never as a repo file, and
  never published as an agent comment/review unless the user explicitly authorizes it. In code,
  only fixes classified as completion or in scope.
- No `git pull`, `merge` or `rebase`. Work with remote refs.
- No commit or push.
