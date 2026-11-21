<!--
TEMPLATE: plan-feature reference — the plan folder for multi-PR initiatives. Include when the repo
runs initiatives that span several PRs or need subplans. Fill: <default branch>, the rules home
(`.rulesync/` or the native rules dir). The automation it mentions is `templates/ci/plan-folder/`.
Strip this comment when writing the file.
-->
# Plan folder

A durable home for an initiative that spans several PRs or needs subplans. One-PR work stays in
the conversation or the plan file, with no folder.

```text
docs/plans/<initiative>/
  plan.md        master plan: one-page summary, goals, dependencies, roadmap
  decisions.md   decision log
  evidence.md    hypotheses and spike results
  <subplan>.md   one per loop, feature or subsystem
```

- **Creation:** after the "go", or when the user asks, as part of the initiative's first PR.
  Until then the plan lives in the conversation or the plan file, with a `## Decisions` section
  that becomes `decisions.md`.
- **Language:** the user's language, an explicit exception to the English rule for repo artifacts.
  Paths, identifiers and code stay in English.
- **Single writer:** only the orchestrator of the master plan writes `plan.md`, `decisions.md` and
  `evidence.md`. Subplan sessions report back through their handoff, so parallel PRs do not
  collide on these files.
- **When the writer cannot write** (the session is not the master plan's, or plan mode is on): the
  decisions stay in the plan's `## Decisions` or in the subplan's return block. The orchestrator
  carries them to `decisions.md` in a batched docs PR, outside the scope of the topic PRs.
- **Name:** the folder name is the initiative, in `[a-z0-9-]` and starting with a letter or digit.
  Any other name can never be closed, because the gate rejects the `Closes-plan:` line.
- **Never merged to `<default branch>`:** a folder that only exists on an unmerged branch needs no
  marker when it is dropped.
- **Orchestration branch:** the master plan's orchestrator keeps a local branch (e.g.
  `<user>/<initiative>-orchestration`) that is never pushed and only ever carries
  `docs/plans/<initiative>/`. Any other change (rules, agents, skills, code) goes on a new branch
  from `origin/<default branch>` with its own PR. When one merges, merge `<default branch>` into
  the orchestration branch. The plan notes reach `<default branch>` in a batched docs PR from a
  fresh branch.
- **Moving a folder** inside `docs/plans/` (from `a` to `b`) is a rename, not a closure: no
  marker, because the initiative continues.

## decisions.md

One row per decision, appended and never rewritten:

| Id | Date | Decision | Why | Alternatives rejected | Status | Depends on |
|---|---|---|---|---|---|---|

Status: `active`, `pending`, `discarded`, or `superseded by D-<n>`. Reversing a decision adds a
new row and marks the old one superseded. Record why an option was dropped, not only that it was.

## Clarifications and consolidation

1. During the discussion the plan body stays as it is. Show only what changed: the affected
   decisions, alternatives or sections. Never re-post the whole plan after a doubt.
2. Doubts go to `## Clarifications`. When the user approves an entry, delete it from there,
   leave the line `Already approved: …`, and add the row to `decisions.md`.
3. **Accepting an answer is not permission to rewrite the plan.** The body changes only when the
   user asks to consolidate ("consolidate", "consolidate the plan").
4. Consolidating folds every active decision into the matching section, then checks that no
   discarded option, stale note or contradiction remains. `decisions.md` keeps the history.

## Subplans

Open a subplan when a part needs extensive research, its own loop, or a separate session.

Handoff to the new session, self-contained, because it sees nothing from this conversation:

```markdown
## Subplan handoff — <name>

**Objective:** <the question to answer, or the outcome>
**Parent:** docs/plans/<initiative>/plan.md, section <x>
**Decisions that bind you:** <ids and one line each>
**Hypotheses in scope:** <ids>
**Sources and tools:** <what to read and use>
**Boundaries:** <out of scope; what needs the user>
**Return format:** <below>
```

Return to the parent, one block, which the orchestrator merges into the master plan:

```markdown
**Conclusions:** <one line each, with evidence tags>
**Decisions proposed:** <rows for decisions.md>
**Dependencies changed:** <what else this affects>
**Open questions:** <with a recommendation>
```

A subplan never changes the master plan by itself. Its proposals become decisions only once the
user accepts them.

## Closing an initiative

The folder is temporary. It goes away in the **last PR** of the initiative, reviewed like any
change:

1. Promote what must outlive it: rules to the rules home (`.rulesync/`), facts to `docs/`, reasons
   to comments next to the code they explain. Git keeps the deleted text, but no agent will look
   for it there.
2. Delete `docs/plans/<initiative>/` in that same PR.
3. Add a `Closes-plan: <initiative>` line to the PR body. List the promoted items in the PR body.

`plan-folder-gate.yml` (`templates/ci/plan-folder/`) fails the PR if the marker and the deletion
do not match. A file renamed out of the folder (`git mv` to `docs/`) counts as removed. A
`pull_request_target` workflow is read from the default branch, so the gate only starts working
once it has landed there; it is advisory while the target branch has no protection. Never delete
the folder from a bot commit on a branch whose release step requires green CI on an exact SHA.
`plan-folder-stale.yml` opens an issue for folders untouched for 30 days and deletes nothing.
